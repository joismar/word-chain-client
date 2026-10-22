import { describe, expect, it } from 'vitest';
import { sanitizeInput, toBoardText } from './sanitize';

describe('sanitizeInput', () => {
  it('keeps upper-case letters and digits without accents', () => {
    expect(sanitizeInput('joão d!')).toBe('JOAOD');
    expect(sanitizeInput('Ação 2')).toBe('ACAO2');
  });
});

describe('toBoardText', () => {
  it('upper-cases, drops accents and keeps the symbols the font has', () => {
    expect(toBoardText('ab-reação')).toBe('AB-REACAO');
    expect(toBoardText("ab'saber")).toBe("AB'SABER");
    expect(toBoardText('Zoë ✓')).toBe('ZOE ✓');
  });

  it('turns characters the font lacks into ?', () => {
    expect(toBoardText('ana😀')).toBe('ANA?');
  });
});
