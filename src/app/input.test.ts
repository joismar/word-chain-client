import { describe, expect, it } from 'vitest';
import { acceptInput } from './input';

describe('acceptInput', () => {
  it('upper-cases, strips accents and symbols, and caps the length', () => {
    expect(acceptInput('ação legal!', 6)).toBe('ACAOLE');
  });

  it('keeps pasted text up to the limit', () => {
    expect(acceptInput('  sala 42 ', 10)).toBe('SALA42');
  });
});
