import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }));

import { countOver, sumOver, normalizeAbuseSettings, DEFAULT_ABUSE_SETTINGS } from '../abuse-alerts';

describe('abuse alert helpers', () => {
  it('countOver flags keys at or above the threshold, biggest first, ignoring blanks', () => {
    const r = countOver(['a', 'b', 'a', null, 'c', 'a', 'b', undefined], 2);
    expect(r).toEqual([{ key: 'a', count: 3 }, { key: 'b', count: 2 }]);
  });
  it('sumOver adds values per key before comparing', () => {
    const r = sumOver([{ key: 'p1', value: 700 }, { key: 'p1', value: 900 }, { key: 'p2', value: 100 }, { key: null, value: 9999 }], 1500);
    expect(r).toEqual([{ key: 'p1', count: 1600 }]);
  });
  it('normalizeAbuseSettings fills defaults and clamps bad input', () => {
    expect(normalizeAbuseSettings(null)).toEqual(DEFAULT_ABUSE_SETTINGS);
    const n = normalizeAbuseSettings({ referralsPer24h: '100', signupsPerHour: -5, xpPerPlayerPer24h: 'abc', verifiedPerStorePer24h: 1e9 });
    expect(n.referralsPer24h).toBe(100);
    expect(n.signupsPerHour).toBe(1);
    expect(n.xpPerPlayerPer24h).toBe(DEFAULT_ABUSE_SETTINGS.xpPerPlayerPer24h);
    expect(n.verifiedPerStorePer24h).toBe(100000);
    expect(n.unverifiedDays).toBe(7);
    expect(normalizeAbuseSettings({ unverifiedDays: 3 }).unverifiedDays).toBe(3);
  });
});
