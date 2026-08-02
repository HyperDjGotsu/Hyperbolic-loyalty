// Shared SSRF-safe iCal fetcher used by both per-store and network sync routes.
import { promises as dns } from 'dns';

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 10_000; // 10 seconds
const MAX_REDIRECTS = 3;

// Checks both literal IP strings and resolved DNS addresses
function isBlockedIp(ip: string): boolean {
  const v4 = ip.trim();

  // IPv4-mapped IPv6 — ::ffff:10.0.0.1 etc.
  const mapped = v4.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return isBlockedIp(mapped[1]);

  if (
    v4 === 'localhost' ||
    v4 === '::1' ||
    v4.startsWith('127.') ||
    v4.startsWith('0.') ||
    v4.startsWith('10.') ||
    v4.startsWith('169.254.') || // link-local / cloud metadata (AWS: 169.254.169.254)
    v4.startsWith('100.64.') || // CGNAT
    /^172\.(1[6-9]|2\d|3[01])\./.test(v4) ||
    v4.startsWith('192.168.') ||
    /^[fF][cCdD]/.test(v4) || // IPv6 ULA (fc00::/7)
    v4 === '0.0.0.0' ||
    v4 === '::'
  ) {
    return true;
  }
  return false;
}

async function resolveAndValidateHost(hostname: string): Promise<void> {
  // Reject literal IPs that are in blocked ranges
  if (isBlockedIp(hostname)) {
    throw new Error('URL points to a disallowed address');
  }

  // Resolve DNS and validate every returned address
  const results: string[] = [];
  try {
    const v4 = await dns.resolve4(hostname).catch(() => [] as string[]);
    const v6 = await dns.resolve6(hostname).catch(() => [] as string[]);
    results.push(...v4, ...v6);
  } catch {
    throw new Error('Could not resolve calendar URL hostname');
  }

  if (results.length === 0) {
    throw new Error('Could not resolve calendar URL hostname');
  }

  for (const ip of results) {
    if (isBlockedIp(ip)) {
      throw new Error('URL resolves to a disallowed address');
    }
  }
}

export async function validateICalUrl(raw: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Only https:// URLs are allowed');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  await resolveAndValidateHost(hostname);

  return url.toString();
}

export async function fetchICalSafe(rawUrl: string): Promise<string> {
  // Validate the initial URL (DNS resolution included)
  let currentUrl = await validateICalUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  let hopsRemaining = MAX_REDIRECTS;

  try {
    // Manual redirect loop: validate each redirect destination before following,
    // preventing DNS-rebinding attacks where a redirect could point to an
    // internal address that was not present during the initial validation.
    while (true) {
      try {
        response = await fetch(currentUrl, {
          cache: 'no-store',
          redirect: 'manual', // never auto-follow — we validate each hop
          signal: controller.signal,
          headers: { 'User-Agent': 'HyperbolicLoyalty/1.0' },
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') throw new Error('Calendar fetch timed out');
        throw new Error('Failed to reach calendar URL');
      }

      // Follow redirect only after validating the destination
      if (response.status >= 300 && response.status < 400) {
        if (hopsRemaining <= 0) {
          throw new Error('Too many redirects');
        }
        hopsRemaining--;

        const location = response.headers.get('location');
        if (!location) throw new Error('Redirect with no Location header');

        // Resolve relative redirects against the current URL
        const redirectUrl = new URL(location, currentUrl).toString();

        // Validate destination before issuing the next request —
        // this is the key difference from redirect:'follow', which would
        // connect to the redirect target before we can check it.
        currentUrl = await validateICalUrl(redirectUrl);
        continue;
      }

      break; // non-redirect response
    }
  } finally {
    clearTimeout(timer);
  }

  if (!response!.ok) {
    throw new Error(`Calendar returned HTTP ${response!.status}`);
  }

  // Size guard — stream up to MAX_RESPONSE_BYTES, reject if exceeded
  const contentLength = response!.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > MAX_RESPONSE_BYTES) {
    throw new Error('Calendar response too large');
  }

  const reader = response!.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.length;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      reader.cancel();
      throw new Error('Calendar response too large');
    }
    chunks.push(value);
  }

  const text = new TextDecoder().decode(
    chunks.reduce((acc, chunk) => {
      const merged = new Uint8Array(acc.length + chunk.length);
      merged.set(acc);
      merged.set(chunk, acc.length);
      return merged;
    }, new Uint8Array(0))
  );

  // Basic content validation — must look like iCalendar data
  if (!text.includes('BEGIN:VCALENDAR') && !text.includes('BEGIN:VEVENT')) {
    throw new Error('Response does not appear to be valid iCalendar data');
  }

  return text;
}
