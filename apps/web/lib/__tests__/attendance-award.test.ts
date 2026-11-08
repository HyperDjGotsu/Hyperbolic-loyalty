import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAttendanceAward, checkinReviewLine, type AttendanceAwardSteps } from '../attendance-award';

// In-memory stand-in for the three tables. Rows are keyed "event:player", like the natural keys the real cleanup uses,
// and the unique attendance key behaves like event_attendances_event_id_player_id_key. Every delete is recorded so a test
// can prove cleanup never touched a row that belongs to another check-in.
type Faults = {
  attendanceInsert?: 'rejected' | 'ambiguous' | 'ambiguousCommit';
  xpInsert?: 'error' | 'ambiguousCommit';
  pointsInsert?: 'throw' | 'throwAfterCommit';
  removeLedger?: boolean;
  removePoints?: boolean;
  removeAttendance?: boolean;
  delayMs?: number;
};

function makeDb(faults: Faults = {}) {
  const attendance = new Set<string>();
  const xp: string[] = [];
  const points: string[] = [];
  const deleted: string[] = [];
  const calls = { insertAttendance: 0, insertLedger: 0, logPoints: 0, removeAttendance: 0, removeLedger: 0, removePoints: 0 };
  const tick = () => (faults.delayMs !== undefined ? new Promise((r) => setTimeout(r, faults.delayMs)) : Promise.resolve());

  const stepsFor = (event: string, player: string): AttendanceAwardSteps => {
    const key = `${event}:${player}`;
    return {
      insertAttendance: async () => {
        calls.insertAttendance++;
        await tick();
        if (faults.attendanceInsert === 'rejected') return { error: { code: '23503', message: 'fk violation' } };
        if (attendance.has(key)) return { error: { code: '23505', message: 'duplicate key' } };
        if (faults.attendanceInsert === 'ambiguous') return { error: { message: 'fetch failed' } };
        attendance.add(key);
        if (faults.attendanceInsert === 'ambiguousCommit') return { error: { message: 'fetch failed' } };
        return { error: null };
      },
      insertLedger: async () => {
        calls.insertLedger++;
        await tick();
        if (faults.xpInsert === 'error') return { error: { code: '23514', message: 'rejected' } };
        xp.push(key);
        if (faults.xpInsert === 'ambiguousCommit') return { error: { message: 'timeout' } };
        return { error: null };
      },
      logPoints: async () => {
        calls.logPoints++;
        await tick();
        if (faults.pointsInsert === 'throw') throw new Error('points failed');
        points.push(key);
        if (faults.pointsInsert === 'throwAfterCommit') throw new Error('points timeout');
      },
      removeLedger: async () => {
        calls.removeLedger++;
        if (faults.removeLedger) return false;
        for (let i = xp.length - 1; i >= 0; i--) if (xp[i] === key) { xp.splice(i, 1); deleted.push(`xp:${key}`); }
        return true;
      },
      removePoints: async () => {
        calls.removePoints++;
        if (faults.removePoints) return false;
        for (let i = points.length - 1; i >= 0; i--) if (points[i] === key) { points.splice(i, 1); deleted.push(`points:${key}`); }
        return true;
      },
      removeAttendance: async () => {
        calls.removeAttendance++;
        if (faults.removeAttendance) return false;
        if (attendance.delete(key)) deleted.push(`attendance:${key}`);
        return true;
      },
    };
  };
  const count = (rows: string[], key: string) => rows.filter((r) => r === key).length;
  return { attendance, xp, points, deleted, calls, faults, stepsFor, count };
}

const A = ['event1', 'player1'] as const;
const K = 'event1:player1';

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });

describe('success and duplicate behavior (unchanged)', () => {
  it('writes attendance, XP and Prize Points once', async () => {
    const db = makeDb();
    expect(await runAttendanceAward(db.stepsFor(...A))).toEqual({ ok: true });
    expect(db.attendance.has(K)).toBe(true);
    expect(db.xp).toEqual([K]);
    expect(db.points).toEqual([K]);
  });

  it('skips Prize Points when the event has no store', async () => {
    const db = makeDb();
    expect(await runAttendanceAward({ ...db.stepsFor(...A), logPoints: null })).toEqual({ ok: true });
    expect(db.xp).toEqual([K]);
    expect(db.points).toEqual([]);
  });

  it('a duplicate check-in is reported and awards nothing a second time', async () => {
    const db = makeDb();
    await runAttendanceAward(db.stepsFor(...A));
    expect(await runAttendanceAward(db.stepsFor(...A))).toEqual({ ok: false, reason: 'duplicate' });
    expect(db.xp).toEqual([K]);
    expect(db.points).toEqual([K]);
    expect(db.deleted).toEqual([]); // a duplicate never deletes anything
  });
});

describe('clean rollback', () => {
  it('XP failure removes everything and leaves the player not checked in', async () => {
    const db = makeDb({ xpInsert: 'error' });
    expect(await runAttendanceAward(db.stepsFor(...A))).toEqual({ ok: false, reason: 'xp_failed', rolledBack: true, remaining: [] });
    expect(db.attendance.size + db.xp.length + db.points.length).toBe(0);
  });

  it('XP that committed despite an error is removed too', async () => {
    const db = makeDb({ xpInsert: 'ambiguousCommit' });
    const result = await runAttendanceAward(db.stepsFor(...A));
    expect(result).toMatchObject({ ok: false, rolledBack: true });
    expect(db.xp).toEqual([]);
  });

  it('Prize Points failure undoes points, XP and attendance', async () => {
    const db = makeDb({ pointsInsert: 'throwAfterCommit' });
    expect(await runAttendanceAward(db.stepsFor(...A))).toEqual({ ok: false, reason: 'points_failed', rolledBack: true, remaining: [] });
    expect(db.attendance.size + db.xp.length + db.points.length).toBe(0);
  });

  it('a rejected first insert (database said no) is a clean failure with nothing to reconcile', async () => {
    const db = makeDb({ attendanceInsert: 'rejected' });
    expect(await runAttendanceAward(db.stepsFor(...A))).toEqual({ ok: false, reason: 'attendance_failed', rolledBack: true, remaining: [] });
    expect(db.calls.insertLedger).toBe(0);
  });

  it('a retry after a fully rolled-back failure pays exactly once', async () => {
    const db = makeDb({ pointsInsert: 'throw' });
    expect((await runAttendanceAward(db.stepsFor(...A))).ok).toBe(false);
    db.faults.pointsInsert = undefined;
    expect((await runAttendanceAward(db.stepsFor(...A))).ok).toBe(true);
    expect(db.count(db.xp, K)).toBe(1);
    expect(db.count(db.points, K)).toBe(1);
    expect(db.attendance.size).toBe(1);
  });
});

describe('failed removals keep the attendance lock (the double-fault defect)', () => {
  it('XP deletion failure after an ambiguous XP commit: lock stays, retry cannot pay twice', async () => {
    const db = makeDb({ xpInsert: 'ambiguousCommit', removeLedger: true });
    const result = await runAttendanceAward(db.stepsFor(...A));
    expect(result).toEqual({ ok: false, reason: 'xp_failed', rolledBack: false, remaining: ['xp', 'attendance'] });
    expect(db.attendance.has(K)).toBe(true); // the lock was NOT released
    expect(db.calls.removeAttendance).toBe(0); // and was not even attempted

    db.faults.xpInsert = undefined;
    db.faults.removeLedger = false; // the problem clears; a retry still must not pay
    expect(await runAttendanceAward(db.stepsFor(...A))).toEqual({ ok: false, reason: 'duplicate' });
    expect(db.count(db.xp, K)).toBe(1); // still exactly one
  });

  it('Prize Points deletion failure: stops immediately, nothing else is removed, retry cannot pay twice', async () => {
    const db = makeDb({ pointsInsert: 'throwAfterCommit', removePoints: true });
    const result = await runAttendanceAward(db.stepsFor(...A));
    expect(result).toEqual({ ok: false, reason: 'points_failed', rolledBack: false, remaining: ['points', 'xp', 'attendance'] });
    expect(db.calls.removeLedger).toBe(0);
    expect(db.calls.removeAttendance).toBe(0);
    expect(db.attendance.has(K)).toBe(true);
    expect(db.count(db.xp, K)).toBe(1);
    expect(db.count(db.points, K)).toBe(1);

    db.faults.pointsInsert = undefined;
    db.faults.removePoints = false;
    expect(await runAttendanceAward(db.stepsFor(...A))).toEqual({ ok: false, reason: 'duplicate' });
    expect(db.count(db.xp, K)).toBe(1);
    expect(db.count(db.points, K)).toBe(1);
  });

  it('XP deletion failure after points were removed: lock and XP stay', async () => {
    const db = makeDb({ pointsInsert: 'throw', removeLedger: true });
    const result = await runAttendanceAward(db.stepsFor(...A));
    expect(result).toEqual({ ok: false, reason: 'points_failed', rolledBack: false, remaining: ['xp', 'attendance'] });
    expect(db.points).toEqual([]);
    expect(db.xp).toEqual([K]);
    expect(db.attendance.has(K)).toBe(true);
    expect(db.calls.removeAttendance).toBe(0);
  });

  it('attendance deletion failure: XP and points are gone, the lock stays, retry cannot pay', async () => {
    const db = makeDb({ pointsInsert: 'throw', removeAttendance: true });
    const result = await runAttendanceAward(db.stepsFor(...A));
    expect(result).toEqual({ ok: false, reason: 'points_failed', rolledBack: false, remaining: ['attendance'] });
    expect(db.xp).toEqual([]);
    expect(db.points).toEqual([]);
    expect(db.attendance.has(K)).toBe(true);

    db.faults.pointsInsert = undefined;
    db.faults.removeAttendance = false;
    expect(await runAttendanceAward(db.stepsFor(...A))).toEqual({ ok: false, reason: 'duplicate' }); // incomplete, but never paid twice
    expect(db.xp).toEqual([]);
  });

  it('attendance deletion failure on the XP path leaves only the lock', async () => {
    const db = makeDb({ xpInsert: 'error', removeAttendance: true });
    expect(await runAttendanceAward(db.stepsFor(...A))).toEqual({ ok: false, reason: 'xp_failed', rolledBack: false, remaining: ['attendance'] });
    expect(db.xp).toEqual([]);
    expect(db.attendance.has(K)).toBe(true);
  });

  it('a removal that throws is treated as a failed removal, not as success', async () => {
    const db = makeDb({ pointsInsert: 'throw' });
    const steps = db.stepsFor(...A);
    const result = await runAttendanceAward({ ...steps, removePoints: async () => { throw new Error('network'); } });
    expect(result).toMatchObject({ ok: false, rolledBack: false, remaining: ['points', 'xp', 'attendance'] });
    expect(db.attendance.has(K)).toBe(true);
  });

  it('after a manager reconciles the leftovers, the retry pays exactly once', async () => {
    const db = makeDb({ xpInsert: 'ambiguousCommit', removeLedger: true });
    await runAttendanceAward(db.stepsFor(...A));
    // manager removes the orphan rows by hand (this is what the reconciliation query points at)
    db.attendance.clear(); db.xp.length = 0; db.points.length = 0;
    db.faults.xpInsert = undefined; db.faults.removeLedger = false;
    expect((await runAttendanceAward(db.stepsFor(...A))).ok).toBe(true);
    expect(db.count(db.xp, K)).toBe(1);
    expect(db.count(db.points, K)).toBe(1);
  });
});

describe('ambiguous first insert', () => {
  it('a dropped connection on the attendance insert awards nothing, deletes nothing and is flagged', async () => {
    const db = makeDb({ attendanceInsert: 'ambiguousCommit' }); // the row landed but we never heard back
    const result = await runAttendanceAward(db.stepsFor(...A));
    expect(result).toEqual({ ok: false, reason: 'attendance_failed', rolledBack: false, remaining: ['attendance_unknown'] });
    expect(db.calls.insertLedger).toBe(0);
    expect(db.calls.logPoints).toBe(0);
    expect(db.deleted).toEqual([]); // cannot tell the row from another request's, so it is left alone
    db.faults.attendanceInsert = undefined;
    expect(await runAttendanceAward(db.stepsFor(...A))).toEqual({ ok: false, reason: 'duplicate' });
    expect(db.xp).toEqual([]);
  });
});

describe('concurrent check-in attempts', () => {
  it('five simultaneous taps: exactly one wins, four are duplicates, nothing is deleted', async () => {
    const db = makeDb({ delayMs: 1 });
    const results = await Promise.all(Array.from({ length: 5 }, () => runAttendanceAward(db.stepsFor(...A))));
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === 'duplicate')).toHaveLength(4);
    expect(db.count(db.xp, K)).toBe(1);
    expect(db.count(db.points, K)).toBe(1);
    expect(db.deleted).toEqual([]);
  });

  it('only the winner ever runs cleanup when the winner fails; the losers never delete', async () => {
    const db = makeDb({ delayMs: 1, pointsInsert: 'throw' });
    const results = await Promise.all(Array.from({ length: 4 }, () => runAttendanceAward(db.stepsFor(...A))));
    expect(results.filter((r) => !r.ok && r.reason === 'points_failed')).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === 'duplicate')).toHaveLength(3);
    expect(db.calls.removeAttendance).toBe(1); // one removal in total: the owner's
    expect(db.calls.removeLedger).toBe(1);
    expect(db.calls.removePoints).toBe(1);
    expect(db.attendance.size + db.xp.length + db.points.length).toBe(0);
  });

  it('different players checking in at the same time do not affect each other', async () => {
    const db = makeDb({ delayMs: 1 });
    const results = await Promise.all(['p1', 'p2', 'p3'].map((p) => runAttendanceAward(db.stepsFor('event1', p))));
    expect(results.every((r) => r.ok)).toBe(true);
    expect(db.xp.sort()).toEqual(['event1:p1', 'event1:p2', 'event1:p3']);
  });
});

describe('cleanup is idempotent and only touches its own rows', () => {
  it('never deletes another player, another event, or another request\'s awards', async () => {
    const db = makeDb();
    await runAttendanceAward(db.stepsFor('event1', 'other')); // same event, different player: succeeds and stays
    await runAttendanceAward(db.stepsFor('event2', 'player1')); // same player, different event: succeeds and stays
    db.faults.pointsInsert = 'throw';
    const failed = await runAttendanceAward(db.stepsFor(...A));
    expect(failed).toMatchObject({ ok: false, rolledBack: true });
    expect(db.deleted.every((d) => d.endsWith(K))).toBe(true); // every delete was this request's own key
    expect(db.attendance.has('event1:other')).toBe(true);
    expect(db.attendance.has('event2:player1')).toBe(true);
    expect(db.xp.sort()).toEqual(['event1:other', 'event2:player1']);
    expect(db.points.sort()).toEqual(['event1:other', 'event2:player1']);
  });

  it('removing rows that are not there is harmless, and a failed check-in can be repeated safely', async () => {
    const db = makeDb({ xpInsert: 'error' });
    const first = await runAttendanceAward(db.stepsFor(...A));
    const second = await runAttendanceAward(db.stepsFor(...A));
    expect(first).toMatchObject({ rolledBack: true });
    expect(second).toMatchObject({ rolledBack: true });
    expect(db.attendance.size + db.xp.length + db.points.length).toBe(0);
    const steps = db.stepsFor(...A);
    expect(await steps.removeLedger()).toBe(true);
    expect(await steps.removeLedger()).toBe(true); // second removal: nothing left, still fine
    expect(await steps.removeAttendance()).toBe(true);
  });

  it('each step runs at most once per request: no loops, no automatic retries', async () => {
    const db = makeDb({ pointsInsert: 'throwAfterCommit', removePoints: true });
    await runAttendanceAward(db.stepsFor(...A));
    expect(db.calls).toEqual({ insertAttendance: 1, insertLedger: 1, logPoints: 1, removePoints: 1, removeLedger: 0, removeAttendance: 0 });
  });
});

describe('CHECKIN_NEEDS_REVIEW log line', () => {
  const base = {
    eventId: '3f2a1c9e-0000-4000-8000-000000000001',
    playerId: '9b7d5e21-0000-4000-8000-000000000002',
    storeId: '70f71af5-26f1-46ec-b97a-8c8776318d3d',
    staffId: 'af741fa0-c22e-48f8-af85-21ec1db12d7c',
    reason: 'points_failed',
    remaining: ['points', 'xp', 'attendance'] as const,
    at: new Date('2026-11-08T21:30:00Z'),
  };

  it('is one searchable line with only ids and codes', () => {
    const line = checkinReviewLine({ ...base, remaining: [...base.remaining] });
    expect(line).toBe(
      'CHECKIN_NEEDS_REVIEW event=3f2a1c9e-0000-4000-8000-000000000001 player=9b7d5e21-0000-4000-8000-000000000002 ' +
      'store=70f71af5-26f1-46ec-b97a-8c8776318d3d staff=af741fa0-c22e-48f8-af85-21ec1db12d7c reason=points_failed ' +
      'remaining=points,xp,attendance at=2026-11-08T21:30:00.000Z'
    );
    expect(line).not.toContain('\n');
  });

  it('says "self" for a player\'s own check-in and "none" for a storeless event', () => {
    const line = checkinReviewLine({ ...base, remaining: ['attendance_unknown'], staffId: null, storeId: null });
    expect(line).toContain('staff=self');
    expect(line).toContain('store=none');
    expect(line).toContain('remaining=attendance_unknown');
  });
});
