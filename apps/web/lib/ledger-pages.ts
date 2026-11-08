// Reads every row of an XP ledger query, not just the first 1,000.
//
// Supabase returns at most 1,000 rows per request. The leaderboard, One Piece and Bounty Hunter standings add up the
// whole ledger in code, so past 1,000 rows they silently counted only an arbitrary slice and ranked people wrongly.
//
// This pages with a KEYSET, not an offset: rows are ordered by their unique `id` and each page asks for rows whose id is
// greater than the last id of the previous page. Offset paging can repeat or skip a row if another row is inserted
// while we read; keyset paging cannot (a row added mid-read is simply either before or after the cursor).
//
// It keeps asking until a page comes back empty instead of stopping at "fewer than a full page", so it stays correct
// even if the server's row cap is lower than the page size we ask for.

export type LedgerPage<Row> = { data: Row[] | null; error: { message?: string } | null };

export const LEDGER_PAGE_SIZE = 1000;
const MAX_PAGES = 10_000; // a runaway guard, ten million rows

/**
 * `fetchPage(afterId, pageSize)` must return a FRESH query for the rows after `afterId` (null = from the start),
 * ordered by `id` ascending and limited to `pageSize`, and the selected columns must include `id`.
 */
export async function fetchAllLedgerRows<Row extends { id: string }>(
  fetchPage: (afterId: string | null, pageSize: number) => PromiseLike<LedgerPage<Row>>,
  pageSize: number = LEDGER_PAGE_SIZE
): Promise<Row[]> {
  const all: Row[] = [];
  let afterId: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await fetchPage(afterId, pageSize);
    if (error) throw new Error(`Ledger read failed: ${error.message ?? 'unknown error'}`);
    const rows = data ?? [];
    if (rows.length === 0) return all;
    for (const row of rows) all.push(row);
    const lastId = rows[rows.length - 1].id;
    if (lastId === afterId) throw new Error('Ledger read made no progress'); // would loop forever
    afterId = lastId;
  }
  throw new Error('Ledger read exceeded the page limit');
}
