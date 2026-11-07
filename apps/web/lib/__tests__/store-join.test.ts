import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ supabase: {}, supabaseAdmin: {} }));

import { generateJoinCode, normalizeJoinCode } from '@/lib/store-join';
import { normalizeJoinCodeClient } from '@/lib/join-code-client';

describe('store join codes', () => {
  it('generates 6 characters from the unambiguous alphabet', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateJoinCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it('does not repeat itself', () => {
    const codes = new Set(Array.from({ length: 200 }, generateJoinCode));
    expect(codes.size).toBeGreaterThan(190);
  });

  it('normalizes case, spaces and dashes', () => {
    expect(normalizeJoinCode(' ab-c d2e3 ')).toBe('ABCD2E3');
    expect(normalizeJoinCode('abcd23')).toBe('ABCD23');
  });

  it('rejects things that cannot be a code', () => {
    for (const bad of [undefined, null, 5, '', 'ABC', 'A'.repeat(13), '!!!!!!', {}]) {
      expect(normalizeJoinCode(bad)).toBeNull();
    }
  });

  it('client and server normalizers agree', () => {
    for (const v of ['abcd23', ' ab-cd 23 ', 'x', 'A'.repeat(13), null]) {
      expect(normalizeJoinCodeClient(v)).toBe(normalizeJoinCode(v));
    }
  });
});
