import { describe, expect, it } from 'vitest';
import { chainOffsets, countOverlap } from './overlap';

describe('countOverlap', () => {
  it('finds the longest shared suffix/prefix', () => {
    expect(countOverlap('CASA', 'SAPO')).toBe(2);
    expect(countOverlap('CASA', 'ASA')).toBe(3);
    expect(countOverlap('CASA', 'ABRE')).toBe(1);
    expect(countOverlap('CASA', 'BOLO')).toBe(0);
    expect(countOverlap('', 'BOLO')).toBe(0);
  });
});

describe('chainOffsets', () => {
  it('starts each word under the letters it shares with the previous one', () => {
    // CASA, SAPO under "SA", POTE under "PO", ELA under "E".
    expect(chainOffsets(['CASA', 'SAPO', 'POTE', 'ELA'])).toEqual([0, 2, 4, 7]);
  });

  it('puts a word with no overlap right after the previous one', () => {
    expect(chainOffsets(['CASA', 'BOLO'])).toEqual([0, 4]);
    expect(chainOffsets([])).toEqual([]);
  });
});
