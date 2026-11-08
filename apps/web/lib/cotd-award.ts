// +10 XP for a player whose Card-of-the-Day vote won. The order is what keeps it honest:
//   1. Look for an XP row already written for THIS vote (its description carries the card and the vote date, so it is
//      unique to the vote). If one exists the XP was already paid: just make sure the vote is marked, never pay again.
//   2. Write the XP row.
//   3. Re-check: if a second request wrote a row at the same moment, only the earliest row stays; the other removes itself.
//   4. Only now mark the vote `xp_awarded`.
// So the flag is never set before the XP exists. If any step fails the vote stays unmarked, nothing is lost, and
// running it again either pays once (nothing was written) or just marks the vote (the XP was already there).

export type DbError = { code?: string | null; message?: string } | null | undefined;

export interface CotdAwardSteps {
  /** Ids of XP rows already written for this vote, oldest first. */
  findXpRows: () => Promise<{ ids: string[]; error: DbError }>;
  insertXp: () => Promise<{ id: string | null; error: DbError }>;
  removeXp: (id: string) => Promise<boolean>;
  markAwarded: () => Promise<{ error: DbError }>;
}

export type CotdAwardResult = 'awarded' | 'already_awarded' | 'failed';

export function cotdXpDescription(cardName: string, voteDate: string): string {
  return `COTD Vote Winner: ${cardName} (${voteDate})`;
}

export async function awardCotdVote(steps: CotdAwardSteps): Promise<CotdAwardResult> {
  const before = await steps.findXpRows();
  if (before.error) {
    console.error('COTD award: could not check for an existing XP row:', before.error);
    return 'failed';
  }
  if (before.ids.length > 0) {
    // Paid before, flag was missed (for example a crash between the two writes): heal the flag only
    const healed = await steps.markAwarded();
    if (healed.error) {
      console.error('COTD award: could not mark an already-paid vote:', healed.error);
      return 'failed';
    }
    return 'already_awarded';
  }

  const inserted = await steps.insertXp();
  if (inserted.error || !inserted.id) {
    // If the write actually landed despite the error, the next run finds it in step 1 and does not pay again
    console.error('COTD award: XP insert failed:', inserted.error);
    return 'failed';
  }

  const after = await steps.findXpRows();
  if (!after.error && after.ids.length > 1 && after.ids[0] !== inserted.id) {
    // Another request paid this vote at the same moment and its row is the earlier one: ours is the duplicate
    const removed = await steps.removeXp(inserted.id);
    if (!removed) console.error(`COTD_NEEDS_REVIEW duplicate XP row ${inserted.id} could not be removed`);
    return 'already_awarded';
  }

  const marked = await steps.markAwarded();
  if (marked.error) {
    console.error('COTD award: XP written but the vote could not be marked (a retry will mark it, not pay again):', marked.error);
    return 'failed';
  }
  return 'awarded';
}
