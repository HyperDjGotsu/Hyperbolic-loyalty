import { describe, it, expect, vi, beforeEach } from 'vitest';
import { awardCotdVote, cotdXpDescription, type CotdAwardSteps } from '../cotd-award';

// In-memory stand-in for the ledger and the vote flag.
function fakeDb(opts: { failInsert?: boolean; insertCommitsDespiteError?: boolean; failMark?: boolean; failFind?: boolean } = {}) {
  const state = { ledger: [] as string[], awarded: false };
  const flags = { ...opts };
  let nextId = 1;
  const steps: CotdAwardSteps = {
    findXpRows: async () => (flags.failFind ? { ids: [], error: { message: 'find failed' } } : { ids: [...state.ledger], error: null }),
    insertXp: async () => {
      if (flags.failInsert) {
        if (flags.insertCommitsDespiteError) state.ledger.push(`row${nextId++}`); // landed, but the response was an error
        return { id: null, error: { message: 'insert failed' } };
      }
      const id = `row${nextId++}`;
      state.ledger.push(id);
      return { id, error: null };
    },
    removeXp: async (id) => { state.ledger = state.ledger.filter((r) => r !== id); return true; },
    markAwarded: async () => {
      if (flags.failMark) return { error: { message: 'mark failed' } };
      state.awarded = true;
      return { error: null };
    },
  };
  return { state, steps, flags };
}

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });

describe('awardCotdVote', () => {
  it('pays once and marks the vote on success', async () => {
    const { state, steps } = fakeDb();
    expect(await awardCotdVote(steps)).toBe('awarded');
    expect(state.ledger).toHaveLength(1);
    expect(state.awarded).toBe(true);
  });

  it('does not mark the vote when the XP insert fails (the old bug)', async () => {
    const { state, steps } = fakeDb({ failInsert: true });
    expect(await awardCotdVote(steps)).toBe('failed');
    expect(state.ledger).toHaveLength(0);
    expect(state.awarded).toBe(false);
  });

  it('a retry after a failed insert pays exactly once', async () => {
    const db = fakeDb({ failInsert: true });
    await awardCotdVote(db.steps);
    db.flags.failInsert = false;
    expect(await awardCotdVote(db.steps)).toBe('awarded');
    expect(db.state.ledger).toHaveLength(1);
    expect(db.state.awarded).toBe(true);
  });

  it('a retry never pays again when the first insert actually landed despite reporting an error', async () => {
    const db = fakeDb({ failInsert: true, insertCommitsDespiteError: true });
    expect(await awardCotdVote(db.steps)).toBe('failed');
    expect(db.state.awarded).toBe(false);
    db.flags.failInsert = false;
    expect(await awardCotdVote(db.steps)).toBe('already_awarded');
    expect(db.state.ledger).toHaveLength(1); // still one
    expect(db.state.awarded).toBe(true); // flag healed
  });

  it('XP written but the flag write fails: reports failure, and the retry only marks, never pays twice', async () => {
    const db = fakeDb({ failMark: true });
    expect(await awardCotdVote(db.steps)).toBe('failed');
    expect(db.state.ledger).toHaveLength(1);
    expect(db.state.awarded).toBe(false);
    db.flags.failMark = false;
    expect(await awardCotdVote(db.steps)).toBe('already_awarded');
    expect(db.state.ledger).toHaveLength(1);
    expect(db.state.awarded).toBe(true);
  });

  it('running it again after success does not pay a second time', async () => {
    const { state, steps } = fakeDb();
    await awardCotdVote(steps);
    expect(await awardCotdVote(steps)).toBe('already_awarded');
    expect(state.ledger).toHaveLength(1);
  });

  it('does nothing when it cannot check for an existing award', async () => {
    const { state, steps } = fakeDb({ failFind: true });
    expect(await awardCotdVote(steps)).toBe('failed');
    expect(state.ledger).toHaveLength(0);
    expect(state.awarded).toBe(false);
  });

  it('two simultaneous requests leave exactly one XP row: the later one removes itself', async () => {
    const state = { ledger: ['early'], awarded: false };
    let calls = 0;
    const steps: CotdAwardSteps = {
      // first look: nothing yet; the other request then writes its (earlier) row before our re-check
      findXpRows: async () => ({ ids: calls++ === 0 ? [] : ['early', 'mine'], error: null }),
      insertXp: async () => { state.ledger.push('mine'); return { id: 'mine', error: null }; },
      removeXp: async (id) => { state.ledger = state.ledger.filter((r) => r !== id); return true; },
      markAwarded: async () => { state.awarded = true; return { error: null }; },
    };
    expect(await awardCotdVote(steps)).toBe('already_awarded');
    expect(state.ledger).toEqual(['early']);
  });

  it('keeps the vote description unique per card and date', () => {
    expect(cotdXpDescription('Pikachu', '2026-11-08')).toBe('COTD Vote Winner: Pikachu (2026-11-08)');
    expect(cotdXpDescription('Pikachu', '2026-11-09')).not.toBe(cotdXpDescription('Pikachu', '2026-11-08'));
  });
});
