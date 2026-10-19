import { describe, expect, it } from 'vitest';
import { computeOverallStats } from '../overall-stats';

// Wednesday 2026-10-21 12:00 Pacific
const NOW = new Date('2026-10-21T19:00:00Z');
const row = (description: string, iso: string) => ({ description, created_at: iso });

describe('computeOverallStats', () => {
  it('returns zeros for no rows', () => {
    expect(computeOverallStats([], NOW)).toEqual({ eventsAttended: 0, matchWins: 0, weekStreak: 0 });
  });

  it('counts kiosk check-ins and their round wins', () => {
    const rows = [
      row('Attended Friday Night Magic', '2026-10-16T02:00:00Z'),
      row('Attended One Piece Weekly — 2 round wins', '2026-10-20T02:00:00Z'),
      row('Attended Draft — 1 round win', '2026-10-21T02:00:00Z'),
    ];
    const s = computeOverallStats(rows, NOW);
    expect(s.eventsAttended).toBe(3);
    expect(s.matchWins).toBe(3);
  });

  it('counts HQ tile awards: Attended once, +1 Win each', () => {
    const rows = [row('Attended, +1 Win, +1 Win', '2026-10-20T02:00:00Z')];
    const s = computeOverallStats(rows, NOW);
    expect(s.eventsAttended).toBe(1);
    expect(s.matchWins).toBe(2);
  });

  it('does not count non-attendance rows as attended', () => {
    const rows = [row('Daily Spin — Gold (+25 XP)', '2026-10-20T02:00:00Z'), row('Welcome bonus', '2026-10-19T02:00:00Z')];
    expect(computeOverallStats(rows, NOW)).toEqual({ eventsAttended: 0, matchWins: 0, weekStreak: 0 });
  });

  it('builds a streak from consecutive weeks including the current one', () => {
    const rows = [
      row('Attended A', '2026-10-21T02:00:00Z'), // this week (Mon Oct 19)
      row('Attended B', '2026-10-14T20:00:00Z'), // last week
      row('Attended C', '2026-10-08T20:00:00Z'), // two weeks ago
      row('Attended D', '2026-09-24T20:00:00Z'), // gap week before
    ];
    expect(computeOverallStats(rows, NOW).weekStreak).toBe(3);
  });

  it('keeps the streak alive when this week has no check-in yet', () => {
    const rows = [row('Attended B', '2026-10-14T20:00:00Z'), row('Attended C', '2026-10-08T20:00:00Z')];
    expect(computeOverallStats(rows, NOW).weekStreak).toBe(2);
  });

  it('resets the streak after a missed week', () => {
    const rows = [row('Attended C', '2026-10-08T20:00:00Z')];
    expect(computeOverallStats(rows, NOW).weekStreak).toBe(0);
  });

  it('puts a late Sunday-night Pacific check-in in the correct week', () => {
    // Sun Oct 18 8pm Pacific = Mon Oct 19 03:00 UTC; belongs to the week of Oct 12, not Oct 19.
    const rows = [row('Attended Sunday', '2026-10-19T03:00:00Z')];
    expect(computeOverallStats(rows, NOW).weekStreak).toBe(1); // last week counts, current week empty
  });
});
