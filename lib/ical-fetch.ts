// Shared SSRF-safe iCal fetcher used by both per-store and network sync routes.

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 10_000; // 10 seconds

// Private/reserved IP ranges that must never be fetched
const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local / cloud metadata
  /^[fF][cCdD]/, // IPv6 ULA
  /^\[?::1\]?$/, // IPv6 loopback
];

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

  const host = url.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(host)) {
      throw new Error('URL points to a disallowed address');
    }
  }

  return url.toString();
}

export async function fetchICalSafe(rawUrl: string): Promise<string> {
  const url = await validateICalUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'HyperbolicLoyalty/1.0' },
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === 'AbortError') throw new Error('Calendar fetch timed out');
    throw new Error('Failed to reach calendar URL');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Calendar returned HTTP ${response.status}`);
  }

  // Re-validate redirect destination (fetch may have followed to a different host)
  const finalUrl = response.url;
  if (finalUrl && finalUrl !== url) {
    await validateICalUrl(finalUrl);
  }

  // Size guard — stream up to MAX_RESPONSE_BYTES, reject if exceeded
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > MAX_RESPONSE_BYTES) {
    throw new Error('Calendar response too large');
  }

  const reader = response.body?.getReader();
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
