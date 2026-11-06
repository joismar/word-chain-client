import { describe, expect, it } from 'vitest';
import { PlayerColor } from '@src/protocol/schema';
import { clampChroma, contrast, inGamut, oklchToLinear, toHex } from './oklch';
import { BOARD, BOARD_COLORS, HUD_COLORS, pieceColors, playerTone, TONE_COLORS, TONES } from './palette';

describe('oklch', () => {
  it('converts the reference points of sRGB', () => {
    expect(toHex({ l: 1, c: 0, h: 0 })).toBe(0xffffff);
    expect(toHex({ l: 0, c: 0, h: 0 })).toBe(0x000000);
    // sRGB red is oklch(62.8% 0.2577 29.23).
    expect(toHex({ l: 0.62796, c: 0.25768, h: 29.2339 })).toBe(0xff0000);
  });

  it('pulls an out-of-gamut colour back by lowering chroma only', () => {
    const loud = { l: 0.7, c: 0.4, h: 150 };
    expect(inGamut(loud)).toBe(false);
    const fitted = clampChroma(loud);
    expect(inGamut(fitted)).toBe(true);
    expect(fitted).toMatchObject({ l: 0.7, h: 150 });
    expect(fitted.c).toBeLessThan(0.4);
    expect(fitted.c).toBeGreaterThan(0.1);
  });

  it('measures WCAG contrast', () => {
    expect(contrast(0xffffff, 0x000000)).toBeCloseTo(21);
    expect(contrast(0x777777, 0x777777)).toBe(1);
  });

  it('keeps grey neutral', () => {
    const [r, g, b] = oklchToLinear({ l: 0.5, c: 0, h: 123 });
    expect(r).toBeCloseTo(g, 6);
    expect(g).toBeCloseTo(b, 6);
  });
});

describe('palette', () => {
  const tones = Object.keys(TONES) as (keyof typeof TONES)[];

  it('fits every tile face in sRGB without losing chroma', () => {
    for (const tone of tones) expect(inGamut(TONE_COLORS[tone]), tone).toBe(true);
  });

  it('gives every face the same lightness', () => {
    expect(new Set(tones.map((t) => TONE_COLORS[t].l)).size).toBe(1);
  });

  it('keeps letters readable on every face (WCAG AA)', () => {
    for (const tone of tones) {
      expect(contrast(TONES[tone].text, TONES[tone].face), tone).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('sets tiles apart from the empty board', () => {
    for (const tone of tones) expect(contrast(TONES[tone].face, BOARD.emptyCell), tone).toBeGreaterThan(2);
  });

  it('gives each player colour its own tone', () => {
    const mapped = PlayerColor.options.map(playerTone);
    expect(new Set(mapped).size).toBe(PlayerColor.options.length);
    expect(playerTone(null)).toBe('stone');
  });
});

describe('HUD pieces', () => {
  const tones = Object.keys(TONES) as (keyof typeof TONES)[];
  const variants = ['solid', 'neutral', 'soft', 'disabled'] as const;

  it('fits every piece colour in sRGB', () => {
    for (const variant of variants) {
      for (const tone of tones) {
        const { face, text, shadow } = pieceColors(variant, tone);
        for (const color of [face, text, shadow]) expect(inGamut(color), `${variant} ${tone}`).toBe(true);
      }
    }
    for (const [name, color] of Object.entries(HUD_COLORS)) expect(inGamut(color), name).toBe(true);
  });

  it('keeps labels readable on every enabled piece (WCAG AA)', () => {
    for (const variant of ['solid', 'neutral', 'soft'] as const) {
      for (const tone of tones) {
        const { face, text } = pieceColors(variant, tone);
        expect(contrast(toHex(text), toHex(face)), `${variant} ${tone}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps HUD text readable on the board and in the drawer', () => {
    for (const ground of [BOARD_COLORS.background, HUD_COLORS.drawerSurface]) {
      expect(contrast(toHex(HUD_COLORS.ink), toHex(ground))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(toHex(HUD_COLORS.muted), toHex(ground))).toBeGreaterThanOrEqual(4.5);
    }
  });
});
