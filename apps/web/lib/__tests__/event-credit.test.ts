import { describe, it, expect } from 'vitest';
import { pacificMonthKey, EVENT_CREDIT_AMOUNT_CENTS } from '../event-credit';

describe('pacificMonthKey', () => {
  it('uses the Pacific month, not the UTC month, just after local midnight on the 1st', () =>
    expect(pacificMonthKey(new Date('2026-11-01T07:30:00Z'))).toBe('2026-11-01'));
  it('is still the previous month late on the last Pacific day, even though UTC has rolled over', () =>
    expect(pacificMonthKey(new Date('2026-11-01T05:30:00Z'))).toBe('2026-10-01'));
  it('handles mid-month', () =>
    expect(pacificMonthKey(new Date('2026-10-30T17:00:00Z'))).toBe('2026-10-01'));
  it('rolls the year over in Pacific time', () => {
    expect(pacificMonthKey(new Date('2027-01-01T08:00:00Z'))).toBe('2027-01-01');
    expect(pacificMonthKey(new Date('2027-01-01T07:59:00Z'))).toBe('2026-12-01');
  });
});

describe('Event Credit amount', () => {
  it('is $15', () => expect(EVENT_CREDIT_AMOUNT_CENTS).toBe(1500));
});
