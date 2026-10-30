// Diamond members' monthly Event Credit: a one-time $15 credit toward events, redeemed in person.
export const EVENT_CREDIT_AMOUNT_CENTS = 1500;
export const EVENT_CREDIT_TIER = 'diamond';
const EVENT_CREDIT_TIMEZONE = 'America/Los_Angeles';

// First day of the Pacific calendar month containing `now`, as YYYY-MM-01. One credit per player per key.
export function pacificMonthKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_CREDIT_TIMEZONE, year: 'numeric', month: '2-digit' }).formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  return `${year}-${month}-01`;
}
