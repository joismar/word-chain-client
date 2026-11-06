import { describe, expect, it } from 'vitest';
import { computeBoard } from '@src/engine/layout';
import { hudClearRows } from './clearRows';

describe('hudClearRows', () => {
  it('leaves the rows between the chips and the message on a phone', () => {
    expect(hudClearRows(computeBoard({ width: 375, height: 812 }), false)).toEqual({ top: -11, bottom: 10 });
  });

  it('frees more rows on top when the HUD packs into one bar (keyboard open)', () => {
    expect(hudClearRows(computeBoard({ width: 375, height: 400 }), true)).toEqual({ top: -5, bottom: 2 });
  });

  it('keeps the rows on a short desktop window', () => {
    expect(hudClearRows(computeBoard({ width: 1280, height: 600 }), true)).toEqual({ top: -7, bottom: 5 });
  });
});
