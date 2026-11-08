// Next.js 14 keeps GET fetches in its own data cache, and that cache outlives deploys.
// Database requests made through supabase-js are fetches, so without this a query can keep
// returning the answer it got the first time (old leaderboard totals, old staff roles, etc.).
// Every server-side Supabase client passes this as its fetch so each query hits the database.
export const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' });
