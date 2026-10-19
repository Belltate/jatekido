import { describe, expect, it } from 'vitest';
import { formatClock } from '../web/format.js';

describe('formatClock', () => {
  it('egy óra alatt perc:másodperc', () => {
    expect(formatClock(20 * 60_000)).toBe('20:00');
    expect(formatClock(59 * 60_000 + 59_000)).toBe('59:59');
    expect(formatClock(5_000)).toBe('0:05');
  });
  it('egy órától óra:perc:másodperc', () => {
    expect(formatClock(3 * 3_600_000)).toBe('3:00:00');
    expect(formatClock(3_600_000 + 2 * 60_000 + 3_000)).toBe('1:02:03');
  });
  it('felfelé kerekít: indításkor a teljes idő látszik, 0:00 csak a végén', () => {
    expect(formatClock(20 * 60_000 - 1)).toBe('20:00');
    expect(formatClock(1)).toBe('0:01');
    expect(formatClock(0)).toBe('0:00');
  });
  it('negatív időből 0:00 lesz', () => {
    expect(formatClock(-500)).toBe('0:00');
  });
});
