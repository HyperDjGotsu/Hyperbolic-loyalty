import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

type Row = Record<string, unknown>;
const state: {
  existing: { revoked_at: string | null } | null;
  upsertRows: { title_key: string }[];
  rpcResult: boolean;
  inserts: { table: string; row: Row }[];
  updates: { table: string; row: Row }[];
  rpcCalls: Row[];
} = { existing: null, upsertRows: [], rpcResult: true, inserts: [], updates: [], rpcCalls: [] };

vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/supabase', () => {
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    const chain = () => b;
    b.select = chain; b.eq = chain; b.is = chain; b.in = chain;
    b.maybeSingle = () => Promise.resolve({ data: table === 'player_titles' ? state.existing : { home_store_id: 'store-1' }, error: null });
    b.upsert = () => ({ select: () => Promise.resolve({ data: state.upsertRows, error: null }) });
    b.insert = (row: Row) => { state.inserts.push({ table, row }); return Promise.resolve({ error: null }); };
    b.update = (row: Row) => { state.updates.push({ table, row }); return b; };
    return b;
  };
  return {
    supabaseAdmin: {
      from: (table: string) => builder(table),
      rpc: (_fn: string, args: Row) => { state.rpcCalls.push(args); return Promise.resolve({ data: state.rpcResult, error: null }); },
    },
  };
});

import { grantTitle, normalizeTitleSettings, DEFAULT_TITLE_SETTINGS } from '../titles-server';
import { isTitleKey, sortTitles } from '../titles';

const xpRows = () => state.inserts.filter(i => i.table === 'xp_ledger');

describe('titles', () => {
  beforeEach(() => { state.existing = null; state.upsertRows = []; state.rpcResult = true; state.inserts = []; state.updates = []; state.rpcCalls = []; });

  it('knows its title keys and orders them', () => {
    expect(isTitleKey('founding_member')).toBe(true);
    expect(isTitleKey('admin')).toBe(false);
    expect(isTitleKey('toString')).toBe(false);
    expect(sortTitles(['beta_tester', 'nonsense', 'founding_member'])).toEqual(['founding_member', 'beta_tester']);
  });

  it('first grant pays the 100 XP bonus once and flags founding members', async () => {
    state.upsertRows = [{ title_key: 'founding_member' }];
    expect(await grantTitle('p1', 'founding_member', null)).toBe(true);
    expect(xpRows()).toHaveLength(1);
    expect(xpRows()[0].row).toMatchObject({ player_id: 'p1', final_xp: 100, source: 'achievement', store_id: 'store-1' });
    expect(state.updates.some(u => u.table === 'players' && u.row.is_founding_member === true)).toBe(true);
  });

  it('a title the player already holds pays nothing', async () => {
    state.existing = { revoked_at: null };
    expect(await grantTitle('p1', 'beta_tester', null)).toBe(false);
    expect(xpRows()).toHaveLength(0);
  });

  it('giving back a removed title restores it without paying the bonus again', async () => {
    state.existing = { revoked_at: '2026-11-01T00:00:00Z' };
    expect(await grantTitle('p1', 'beta_tester', 'admin1')).toBe(true);
    expect(xpRows()).toHaveLength(0);
    expect(state.updates.some(u => u.table === 'player_titles' && u.row.revoked_at === null)).toBe(true);
  });

  it('an automatic award never undoes a removal', async () => {
    state.existing = { revoked_at: '2026-11-01T00:00:00Z' };
    expect(await grantTitle('p1', 'founding_member', null, { cap: 100 })).toBe(false);
    expect(state.rpcCalls).toHaveLength(0);
    expect(xpRows()).toHaveLength(0);
  });

  it('a capped award goes through the atomic database function', async () => {
    state.rpcResult = true;
    expect(await grantTitle('p1', 'founding_member', null, { cap: 100 })).toBe(true);
    expect(state.rpcCalls).toEqual([{ p_player: 'p1', p_title: 'founding_member', p_cap: 100, p_by: null }]);
    expect(xpRows()).toHaveLength(1);
  });

  it('a capped award over the limit gives nothing', async () => {
    state.rpcResult = false;
    expect(await grantTitle('p1', 'founding_member', null, { cap: 100 })).toBe(false);
    expect(xpRows()).toHaveLength(0);
  });

  it('a title with no XP bonus (Administrator) pays nothing', async () => {
    state.upsertRows = [{ title_key: 'administrator' }];
    expect(await grantTitle('p1', 'administrator', 'admin1')).toBe(true);
    expect(xpRows()).toHaveLength(0);
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
