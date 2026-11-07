import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

import { currentCheckinToken, isValidCheckinToken, TOKEN_BLOCK_MS, TOKEN_GRACE_BLOCKS } from '../checkin-token';

describe('checkin token', () => {
  beforeEach(() => { process.env.CHECKIN_TOKEN_SECRET = 'test-secret'; });
  const t0 = 1_800_000_000_000;

  it('accepts the current token', () => {
    const { token } = currentCheckinToken('evt1', t0);
    expect(isValidCheckinToken('evt1', token, t0)).toBe(true);
  });
  it('is bound to the event', () => {
    const { token } = currentCheckinToken('evt1', t0);
    expect(isValidCheckinToken('evt2', token, t0)).toBe(false);
  });
  it('stays valid through the grace blocks, then expires', () => {
    const { token } = currentCheckinToken('evt1', t0);
    expect(isValidCheckinToken('evt1', token, t0 + TOKEN_GRACE_BLOCKS * TOKEN_BLOCK_MS)).toBe(true);
    expect(isValidCheckinToken('evt1', token, t0 + (TOKEN_GRACE_BLOCKS + 1) * TOKEN_BLOCK_MS)).toBe(false);
  });
  it('rejects missing, malformed and tampered tokens', () => {
    const { token } = currentCheckinToken('evt1', t0);
    expect(isValidCheckinToken('evt1', undefined, t0)).toBe(false);
    expect(isValidCheckinToken('evt1', '', t0)).toBe(false);
    expect(isValidCheckinToken('evt1', 'short', t0)).toBe(false);
    expect(isValidCheckinToken('evt1', token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A'), t0)).toBe(false);
  });
  it('changes every block and reports time to the next one', () => {
    const a = currentCheckinToken('evt1', t0);
    const b = currentCheckinToken('evt1', t0 + TOKEN_BLOCK_MS);
    expect(a.token).not.toBe(b.token);
    expect(a.rotatesInMs).toBeGreaterThan(0);
    expect(a.rotatesInMs).toBeLessThanOrEqual(TOKEN_BLOCK_MS);
  });
});
