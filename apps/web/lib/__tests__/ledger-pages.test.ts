import { describe, it, expect } from 'vitest';
import { fetchAllLedgerRows, type LedgerPage } from '../ledger-pages';

type Row = { id: string; player_id: string; final_xp: number };

// A fake table that behaves like the real query: ordered by id, "greater than the cursor", limited by the page size and
// by the server's own row cap (Supabase's default is 1,000).
function fakeTable(rows: Row[], cap = 1000) {
  const sorted = () => [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const calls: Array<string | null> = [];
  const fetchPage = async (afterId: string | null, pageSize: number): Promise<LedgerPage<Row>> => {
    calls.push(afterId);
    const page = sorted().filter((r) => afterId === null || r.id > afterId).slice(0, Math.min(pageSize, cap));
    return { data: page, error: null };
  };
  return { rows, fetchPage, calls };
}

// Deterministic, deliberately unordered ids
function makeRows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => {
    const hashed = ((i * 2654435761) >>> 0).toString(16).padStart(8, '0');
    return { id: `${hashed}-${String(i).padStart(6, '0')}`, player_id: `p${i % 37}`, final_xp: (i % 9) + 1 };
  });
}

const totalsOf = (rows: Row[]) => {
  const t: Record<string, number> = {};
  for (const r of rows) t[r.player_id] = (t[r.player_id] ?? 0) + r.final_xp;
  return t;
};

describe('fetchAllLedgerRows', () => {
  it('returns correct totals for more than 1,000 ledger rows (the leaderboard bug)', async () => {
    const table = fakeTable(makeRows(2500));
    const got = await fetchAllLedgerRows(table.fetchPage);
    expect(got).toHaveLength(2500);
    expect(totalsOf(got)).toEqual(totalsOf(table.rows));

    // The old single-query read would have seen only the first 1,000 rows: prove that really was wrong
    const firstPageOnly = (await table.fetchPage(null, 1000)).data!;
    expect(totalsOf(firstPageOnly)).not.toEqual(totalsOf(table.rows));
  });

  it('has no overlapping or missing rows across page boundaries', async () => {
    const table = fakeTable(makeRows(3000));
    const got = await fetchAllLedgerRows(table.fetchPage);
    const ids = got.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length); // none twice
    expect(new Set(ids)).toEqual(new Set(table.rows.map((r) => r.id))); // none missing
    expect(ids).toEqual([...ids].sort()); // in id order
  });

  it.each([0, 1, 999, 1000, 1001, 2000])('handles exactly %i rows', async (n) => {
    const table = fakeTable(makeRows(n));
    const got = await fetchAllLedgerRows(table.fetchPage);
    expect(got).toHaveLength(n);
    expect(totalsOf(got)).toEqual(totalsOf(table.rows));
  });

  it('stays correct when the server cap is lower than the page size', async () => {
    const table = fakeTable(makeRows(1234), 300);
    const got = await fetchAllLedgerRows(table.fetchPage);
    expect(got).toHaveLength(1234);
    expect(totalsOf(got)).toEqual(totalsOf(table.rows));
  });

  it('does not repeat or skip rows when rows are inserted while reading', async () => {
    const rows = makeRows(2100);
    const table = fakeTable(rows);
    const original = new Set(rows.map((r) => r.id));
    let page = 0;
    const racing = async (afterId: string | null, size: number) => {
      const res = await table.fetchPage(afterId, size);
      if (++page === 1) {
        // a new row sorts BEFORE the cursor after we already read page one, and one AFTER it
        table.rows.push({ id: '00000000-new-low', player_id: 'late', final_xp: 5 });
        table.rows.push({ id: 'ffffffff-new-high', player_id: 'late', final_xp: 7 });
      }
      return res;
    };
    const got = await fetchAllLedgerRows(racing);
    const ids = got.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length); // never twice
    for (const id of Array.from(original)) expect(ids).toContain(id); // nothing that existed was skipped
  });

  it('throws on a read error instead of returning a partial total', async () => {
    let calls = 0;
    const failing = async (): Promise<LedgerPage<Row>> => (++calls === 2
      ? { data: null, error: { message: 'boom' } }
      : { data: makeRows(1000).map((r, i) => ({ ...r, id: `a${String(i).padStart(5, '0')}` })), error: null });
    await expect(fetchAllLedgerRows(failing)).rejects.toThrow('Ledger read failed: boom');
  });

  it('throws instead of looping forever if the cursor never advances', async () => {
    const stuck = async (): Promise<LedgerPage<Row>> => ({ data: [{ id: 'same', player_id: 'x', final_xp: 1 }], error: null });
    await expect(fetchAllLedgerRows(stuck)).rejects.toThrow('no progress');
  });
});
