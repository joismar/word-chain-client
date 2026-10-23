import type { TileTone } from '../engine/types';

/**
 * Every visual number that isn't a colour (palette.ts) or motion
 * (motion/tokens.ts): board and tile geometry, the edge fade, the countdown
 * tile and the HUD. Documented in docs/design-system.md; the HUD's CSS reads
 * them as custom properties (`hudCssVars`), so nothing is written twice.
 */

export const board = {
  /** Cell plus gap in CSS pixels on roomy screens (1.6rem + 0.2rem). */
  maxPitch: 28.8,
  /** Columns that must fit across, shrinking the cell on narrow screens. */
  minCols: 15,
  /** Fraction of the pitch used as the gap between cells. */
  gapRatio: 0.2 / 1.8,
  /**
   * Empty cells near the screen edge drop out at random:
   * chance = density × (1 − d/depth)^curve, d = cells to the nearest edge.
   */
  edgeFade: { depth: 3, density: 0.5, curve: 1.4, seed: 7 },
  /** Below this many rows the HUD packs into one line and the chain shortens (keyboard open). */
  compactRows: 25,
};

export const tile = {
  /** Corner radius, as a fraction of the cell. */
  radius: 0.08,
  /** Height of the darker strip at the bottom of a tile; the face takes the rest. */
  shadow: 0.1,
  /** Glyph size, as a fraction of the cell. */
  glyph: 0.55,
  /** Input cursor on the next slot: side inset, distance of its top from the bottom, thickness. */
  caret: { inset: 0.15, bottom: 0.28, height: 0.08 },
};

/** The start countdown: one big tile that grows each second (3, 2, 1). */
export const countdown: { spans: Record<number, number>; tones: Record<number, TileTone> } = {
  spans: { 3: 3, 2: 5, 1: 7 },
  tones: { 3: 'amber', 2: 'orange', 1: 'rose' },
};

/**
 * HUD pieces, in CSS pixels; names ending in `Em` are em, and in `Radius`
 * or `Alpha` plain factors.
 */
export const hud = {
  radius: 6,
  /** Hard shadow under a piece; pressed or disabled pieces sink by it. */
  shadow: 3,
  miniRadius: 0.7,
  knobRadius: 0.6,
  /** Space between the parts of a piece (label, glyph, meter text). */
  pieceGap: 8,
  pieceTrackingEm: 0.06,
  insetTop: 14,
  insetSide: 14,
  insetBottom: 18,
  insetBottomSide: 16,
  playersTop: 64,
  toastBottom: 84,
  gap: 10,
  chipGap: 8,
  compactGap: 6,
  icon: 40,
  iconGlyph: 17,
  close: 34,
  copy: 30,
  copyIcon: 15,
  buttonHeight: 50,
  buttonMaxWidth: 230,
  buttonText: 15,
  buttonGlyph: 18,
  buttonTrackingEm: 0.1,
  clockHeight: 38,
  clockMinWidth: 84,
  clockText: 17,
  clockPadding: 14,
  chipHeight: 34,
  chipMini: 26,
  chipText: 13,
  chipMiniText: 14,
  chipPaddingStart: 4,
  chipPaddingEnd: 12,
  chipCompactPaddingEnd: 8,
  scoreAlpha: 0.75,
  chipCompactHeight: 30,
  chipCompactMini: 22,
  chipCompactText: 11,
  chipCompactMiniText: 12,
  meter: 3,
  toastHeight: 32,
  toastText: 12,
  toastPadding: 14,
  toastTrackingEm: 0.1,
  titleText: 15,
  titleTrackingEm: 0.16,
  focusRing: 2,
  logoTile: 23,
  logoStep: 26,
  logoGlyph: 14,
  logoTop: 22,
};

export const drawer = {
  radius: 16,
  sideWidth: 380,
  /** Wider screens get the drawer from the right; narrower ones from the bottom. */
  sideMinWidth: 700,
  paddingTop: 10,
  paddingSide: 20,
  paddingBottom: 24,
  sidePaddingTop: 22,
  gap: 4,
  handleWidth: 40,
  handleHeight: 4,
  headerGap: 8,
  closeGlyph: 14,
  divider: 1,
  optionPadding: 14,
  optionGap: 12,
  optionTitle: 14,
  optionText: 12,
  segmentedHeight: 32,
  segmentedText: 12,
  segmentedPadding: 10,
  switchWidth: 52,
  switchHeight: 30,
  switchPadding: 4,
  knob: 22,
};

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function unit(name: string, value: number) {
  if (name.endsWith('Em')) return `${value}em`;
  if (/.(Radius|Alpha)$/.test(name)) return String(value);
  return `${value}px`;
}

/** `--hud-*`, `--drawer-*` and `--tile-*` custom properties for the HUD stylesheet. */
export function hudCssVars(): Record<string, string> {
  const vars: Record<string, string> = {
    '--tile-radius': String(tile.radius),
    '--tile-shadow': String(tile.shadow),
  };
  for (const [name, value] of Object.entries(hud)) vars[`--hud-${kebab(name.replace(/Em$/, ''))}`] = unit(name, value);
  for (const [name, value] of Object.entries(drawer)) vars[`--drawer-${kebab(name)}`] = unit(name, value);
  return vars;
}
