import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const state: { upsertRows: { title_key: string }[]; inserts: { table: string; row: Record<string, unknown> }[]; updates: { table: string; row: Record<string, unknown> }[] } = { upsertRows: [], inserts: [], updates: [] };

vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      upsert: () => ({ select: () => Promise.resolve({ data: state.upsertRows, error: null }) }),
      insert: (row: Record<string, unknown>) => { state.inserts.push({ table, row }); return Promise.resolve({ error: null }); },
      update: (row: Record<string, unknown>) => { state.updates.push({ table, row }); return { eq: () => Promise.resolve({ error: null }) }; },
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { home_store_id: 'store-1' }, error: null }) }) }),
    }),
  },
}));

import { grantTitle, normalizeTitleSettings, DEFAULT_TITLE_SETTINGS } from '../titles-server';
import { isTitleKey, sortTitles } from '../titles';

describe('titles', () => {
  beforeEach(() => { state.upsertRows = []; state.inserts = []; state.updates = []; });

  it('knows its title keys and orders them', () => {
    expect(isTitleKey('founding_member')).toBe(true);
    expect(isTitleKey('admin')).toBe(false);
    expect(isTitleKey('toString')).toBe(false);
    expect(sortTitles(['beta_tester', 'nonsense', 'founding_member'])).toEqual(['founding_member', 'beta_tester']);
  });

  it('first grant pays the 100 XP bonus once and flags founding members', async () => {
    state.upsertRows = [{ title_key: 'founding_member' }];
    expect(await grantTitle('p1', 'founding_member', null)).toBe(true);
    const xp = state.inserts.filter(i => i.table === 'xp_ledger');
    expect(xp).toHaveLength(1);
    expect(xp[0].row).toMatchObject({ player_id: 'p1', final_xp: 100, source: 'achievement', store_id: 'store-1' });
    expect(state.updates.some(u => u.table === 'players' && u.row.is_founding_member === true)).toBe(true);
  });

  it('a title the player already holds pays nothing', async () => {
    state.upsertRows = [];
    expect(await grantTitle('p1', 'beta_tester', null)).toBe(false);
    expect(state.inserts).toHaveLength(0);
  });

  it('rejects unknown titles', async () => {
    await expect(grantTitle('p1', 'overlord', null)).rejects.toThrow('Unknown title');
  });

  it('normalizes settings', () => {
    expect(normalizeTitleSettings(null)).toEqual(DEFAULT_TITLE_SETTINGS);
    expect(normalizeTitleSettings({ autoFounding: false, foundingCap: '250' })).toEqual({ autoFounding: false, foundingCap: 250 });
    expect(normalizeTitleSettings({ foundingCap: -4 }).foundingCap).toBe(0);
    expect(normalizeTitleSettings({ foundingCap: 9e9 }).foundingCap).toBe(100000);
  });
});
