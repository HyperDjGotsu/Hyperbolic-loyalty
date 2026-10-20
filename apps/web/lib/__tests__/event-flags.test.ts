import { describe, it, expect } from 'vitest';
import { parseIsSpecial, stripSpecialFlag } from '../event-flags';

describe('parseIsSpecial', () => {
  it('detects the flag on its own line', () => {
    expect(parseIsSpecial('Type: Special\nPrice: $45\nMax: 64')).toBe(true);
  });
  it('is case and separator tolerant', () => {
    expect(parseIsSpecial('type - special')).toBe(true);
    expect(parseIsSpecial('TYPE:SPECIAL')).toBe(true);
  });
  it('detects the flag with literal escaped newlines', () => {
    expect(parseIsSpecial('Type: Special\\nPrice: $45')).toBe(true);
  });
  it('ignores other types and plain mentions of special', () => {
    expect(parseIsSpecial('Type: Weekly')).toBe(false);
    expect(parseIsSpecial('A special night of drafting')).toBe(false);
    expect(parseIsSpecial('')).toBe(false);
  });
});

describe('stripSpecialFlag', () => {
  it('removes the flag and leaves other lines', () => {
    expect(stripSpecialFlag('Type: Special\nPrice: $45').trim()).toBe('Price: $45');
    expect(stripSpecialFlag('Type: Special\\nPrice: $45')).toBe('Price: $45');
  });
  it('is repeatable (no regex state leaks between calls)', () => {
    const t = 'Type: Special\nx';
    expect(parseIsSpecial(t)).toBe(true);
    expect(parseIsSpecial(t)).toBe(true);
    expect(stripSpecialFlag(t)).toBe(stripSpecialFlag(t));
  });
});
