import { describe, it, expect } from 'vitest';
import { hasPitchAccess, makeAccessToken, passwordMatches, safeNext, PITCH_COOKIE_MAX_AGE_S } from '../pitch-access';

describe('pitch access', () => {
  const now = 1_800_000_000_000;

  it('accepts a fresh token made with the same password', async () => {
    const t = await makeAccessToken('s3cret', now);
    expect(await hasPitchAccess('s3cret', t, now + 1000)).toBe(true);
  });
  it('rejects a different password, a tampered token and an expired one', async () => {
    const t = await makeAccessToken('s3cret', now);
    expect(await hasPitchAccess('other', t, now)).toBe(false);
    expect(await hasPitchAccess('s3cret', t.slice(0, -2) + 'xx', now)).toBe(false);
    expect(await hasPitchAccess('s3cret', t, now + (PITCH_COOKIE_MAX_AGE_S + 5) * 1000)).toBe(false);
  });
  it('rejects missing password or token', async () => {
    expect(await hasPitchAccess(undefined, 'x.y', now)).toBe(false);
    expect(await hasPitchAccess('s3cret', undefined, now)).toBe(false);
    expect(await hasPitchAccess('s3cret', 'garbage', now)).toBe(false);
  });
  it('checks typed passwords', async () => {
    expect(await passwordMatches('s3cret', 's3cret')).toBe(true);
    expect(await passwordMatches('s3cret', 'S3cret')).toBe(false);
    expect(await passwordMatches('s3cret', '')).toBe(false);
    expect(await passwordMatches(undefined, 's3cret')).toBe(false);
    expect(await passwordMatches('s3cret', 5)).toBe(false);
  });
  it('only redirects back to pitch pages', () => {
    expect(safeNext('/pitch')).toBe('/pitch');
    expect(safeNext('/pitch/ggc')).toBe('/pitch/ggc');
    expect(safeNext('/demo')).toBe('/demo');
    expect(safeNext('https://evil.example')).toBe('/pitch');
    expect(safeNext('//evil.example')).toBe('/pitch');
    expect(safeNext('/dashboard')).toBe('/pitch');
    expect(safeNext(null)).toBe('/pitch');
  });
});
