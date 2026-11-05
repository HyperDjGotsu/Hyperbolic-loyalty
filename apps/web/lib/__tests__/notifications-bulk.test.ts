import { describe, it, expect, vi, beforeEach } from 'vitest';

// Fake Supabase: records every query so we can assert how many round trips happen.
const calls = { selects: [] as string[][], inserts: [] as unknown[][] };
let prefsRows: Array<{ id: string; notification_preferences: Record<string, boolean> | null }> = [];
let insertError: unknown = null;

vi.mock('@/lib/supabase', () => ({
  supabase: {},
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        in: (_col: string, ids: string[]) => {
          calls.selects.push(ids);
          return Promise.resolve({ data: prefsRows.filter((r) => ids.includes(r.id)) });
        },
      }),
      insert: (rows: unknown[]) => {
        expect(table).toBe('notifications');
        calls.inserts.push(rows);
        return Promise.resolve({ error: insertError });
      },
    }),
  },
}));

import { createNotificationsBulk, type BulkNotification } from '../notifications';

const item = (playerId: string, category: BulkNotification['category'] = 'daily_rewards'): BulkNotification => ({
  playerId,
  type: 't',
  title: 'title',
  message: 'msg',
  data: null,
  category,
});

beforeEach(() => {
  calls.selects = [];
  calls.inserts = [];
  prefsRows = [];
  insertError = null;
});

describe('createNotificationsBulk', () => {
  it('returns 0 and does no queries for an empty list', async () => {
    expect(await createNotificationsBulk([])).toBe(0);
    expect(calls.selects.length).toBe(0);
    expect(calls.inserts.length).toBe(0);
  });

  it('skips players who opted out of the category, keeps the rest', async () => {
    prefsRows = [
      { id: 'a', notification_preferences: { daily_rewards: false } },
      { id: 'b', notification_preferences: null },
      { id: 'c', notification_preferences: { events: false } },
    ];
    const created = await createNotificationsBulk([item('a'), item('b'), item('c')]);
    expect(created).toBe(2);
    const ids = (calls.inserts[0] as Array<{ player_id: string }>).map((r) => r.player_id);
    expect(ids).toEqual(['b', 'c']);
  });

  it('treats an unknown player as default-on, like createNotification did', async () => {
    const created = await createNotificationsBulk([item('ghost')]);
    expect(created).toBe(1);
  });

  it('uses constant queries: 250 players = 2 preference loads and 3 inserts', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `p${i}`);
    prefsRows = ids.map((id) => ({ id, notification_preferences: null }));
    const created = await createNotificationsBulk(ids.map((id) => item(id)));
    expect(created).toBe(250);
    expect(calls.selects.map((s) => s.length)).toEqual([200, 50]);
    expect(calls.inserts.map((r) => r.length)).toEqual([100, 100, 50]);
  });

  it('does not count a failed insert batch as created', async () => {
    insertError = { message: 'boom' };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await createNotificationsBulk([item('a')])).toBe(0);
    spy.mockRestore();
  });

  it('writes store_id and data through to the row', async () => {
    await createNotificationsBulk([{ ...item('a'), data: { k: 'v' }, storeId: 's1' }]);
    expect(calls.inserts[0][0]).toMatchObject({ player_id: 'a', store_id: 's1', data: { k: 'v' }, is_read: false });
  });
});
