// Canonical app URL for server-side use.
// NEXT_PUBLIC_APP_URL is required in production. Missing it throws immediately so
// misconfigured deployments fail loudly rather than generating broken links.

export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url) return url.replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NEXT_PUBLIC_APP_URL is required in production. ' +
      'Set it as a Vercel environment variable before deploying.'
    );
  }
  return 'http://localhost:3000';
}
