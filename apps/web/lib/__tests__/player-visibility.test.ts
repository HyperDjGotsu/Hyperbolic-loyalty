import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const pages: { data: { id: string }[] | null; error: { message: string } | null }[] = [];
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        is: () => ({
          order: () => ({
            range: () => Promise.resolve(pages.shift()),
          }),
        }),
      }),
    }),
  },
}));

import { getUnverifiedPlayerIds } from '../player-visibility';

describe('getUnverifiedPlayerIds', () => {
  beforeEach(() => { pages.length = 0; });

  it('reads every page, not just the first', async () => {
    pages.push({ data: Array.from({ length: 1000 }, (_, i) => ({ id: `a${i}` })), error: null });
    pages.push({ data: [{ id: 'b1' }, { id: 'b2' }], error: null });
    const ids = await getUnverifiedPlayerIds();
    expect(ids.size).toBe(1002);
    expect(ids.has('b2')).toBe(true);
  });

  it('throws instead of returning an empty list when the lookup fails', async () => {
    pages.push({ data: null, error: { message: 'boom' } });
    await expect(getUnverifiedPlayerIds()).rejects.toThrow('boom');
  });
});
