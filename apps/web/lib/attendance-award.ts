// The write sequence behind an event check-in: attendance row -> XP ledger row -> Prize Point row.
//
// Nothing here is a database transaction (supabase-js has none), so the sequence protects itself instead:
//
//  OWNERSHIP. The attendance row goes first and its unique key (event + player) decides who owns the check-in. The one
//  request that wins that insert is the only request that ever writes XP or points for that pair; a concurrent loser gets
//  a unique violation and returns "duplicate" before writing or deleting anything. Cleanup deletes by the same natural key
//  (event + player + source), so it can only ever touch rows this owner wrote, and no other code path writes those keys.
//
//  CLEANUP ORDER. If a later step fails, the request removes what it wrote, newest first: points, then XP, then the
//  attendance row LAST. The attendance row is the lock. While any earlier removal has not succeeded, the lock stays, so a
//  retry gets "already checked in" and cannot pay a second time.
//
//  STOP ON FIRST FAILED REMOVAL. If a removal fails, nothing further is removed or retried. The result lists which rows may
//  still exist (`remaining`) so it can be reconciled by a person. The sequence never loops and never re-awards.
//
//  Removals are idempotent deletes (removing nothing counts as success), and each is attempted at most once per request.
//  The caller only reports success when every step succeeded.

export type DbError = { code?: string | null; message?: string } | null | undefined;

export interface AttendanceAwardSteps {
  insertAttendance: () => Promise<{ error: DbError }>;
  insertLedger: () => Promise<{ error: DbError }>;
  /** Prize Points; null when the event has no store. Throws on failure (as logPointTransaction does). */
  logPoints: (() => Promise<void>) | null;
  /** Each removal returns true when it worked (nothing to remove also counts as worked). */
  removeAttendance: () => Promise<boolean>;
  removeLedger: () => Promise<boolean>;
  removePoints: () => Promise<boolean>;
}

/** What may still be in the database after a failed check-in. `attendance_unknown` = the first insert failed ambiguously. */
export type RemainingRow = 'attendance' | 'xp' | 'points' | 'attendance_unknown';

export type AttendanceAwardResult =
  | { ok: true }
  | { ok: false; reason: 'duplicate' }
  | {
      ok: false;
      reason: 'attendance_failed' | 'xp_failed' | 'points_failed';
      /** true = everything this request wrote was removed and the player is back to "not checked in" */
      rolledBack: boolean;
      /** rows that may still exist when rolledBack is false; empty when rolledBack is true */
      remaining: RemainingRow[];
    };

// A database error that carries a code means the server received the statement and rejected it, so nothing was written.
// An error with no code (dropped connection, timeout) is ambiguous: the write may or may not have landed.
const isDefiniteRejection = (e: DbError) => !!e && typeof e.code === 'string' && e.code.length > 0;

/**
 * The log line written when a failed check-in may have left rows behind. One searchable token (CHECKIN_NEEDS_REVIEW) plus
 * ids only: no names, emails or card numbers. Reconcile it with supabase/checks/checkin-reconciliation.sql.
 */
export function checkinReviewLine(p: {
  eventId: string;
  playerId: string;
  storeId: string | null;
  staffId: string | null;
  reason: string;
  remaining: RemainingRow[];
  at?: Date;
}): string {
  return (
    `CHECKIN_NEEDS_REVIEW event=${p.eventId} player=${p.playerId} store=${p.storeId || 'none'} ` +
    `staff=${p.staffId ?? 'self'} reason=${p.reason} remaining=${p.remaining.join(',') || 'none'} at=${(p.at ?? new Date()).toISOString()}`
  );
}

export async function runAttendanceAward(steps: AttendanceAwardSteps): Promise<AttendanceAwardResult> {
  const att = await steps.insertAttendance();
  if (att.error) {
    // 23505 = unique violation: someone (a second tap, another device) owns this check-in. Touch nothing.
    if (att.error.code === '23505') return { ok: false, reason: 'duplicate' };
    console.error('Attendance insert error:', att.error);
    return isDefiniteRejection(att.error)
      ? { ok: false, reason: 'attendance_failed', rolledBack: true, remaining: [] }
      // Ambiguous: the row may have been written without us hearing back. We cannot tell it apart from another
      // request's row, so we neither award nor delete. A person reconciles it.
      : { ok: false, reason: 'attendance_failed', rolledBack: false, remaining: ['attendance_unknown'] };
  }

  const safe = async (fn: () => Promise<boolean>): Promise<boolean> => {
    try { return await fn(); } catch (err) { console.error('Check-in rollback step threw:', err); return false; }
  };

  const xp = await steps.insertLedger();
  if (xp.error) {
    console.error('Attendance XP insert failed, undoing check-in:', xp.error);
    // The failed insert may still have committed, so remove by key. If that removal fails, KEEP the attendance lock.
    if (!(await safe(steps.removeLedger))) {
      return { ok: false, reason: 'xp_failed', rolledBack: false, remaining: ['xp', 'attendance'] };
    }
    if (!(await safe(steps.removeAttendance))) {
      return { ok: false, reason: 'xp_failed', rolledBack: false, remaining: ['attendance'] };
    }
    return { ok: false, reason: 'xp_failed', rolledBack: true, remaining: [] };
  }

  if (steps.logPoints) {
    try {
      await steps.logPoints();
    } catch (err) {
      console.error('Attendance Prize Points failed, undoing check-in:', err);
      if (!(await safe(steps.removePoints))) {
        return { ok: false, reason: 'points_failed', rolledBack: false, remaining: ['points', 'xp', 'attendance'] };
      }
      if (!(await safe(steps.removeLedger))) {
        return { ok: false, reason: 'points_failed', rolledBack: false, remaining: ['xp', 'attendance'] };
      }
      if (!(await safe(steps.removeAttendance))) {
        return { ok: false, reason: 'points_failed', rolledBack: false, remaining: ['attendance'] };
      }
      return { ok: false, reason: 'points_failed', rolledBack: true, remaining: [] };
    }
  }

  return { ok: true };
}
