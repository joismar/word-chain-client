/**
 * Every animation number lives here. Distances are in board pitches (one
 * cell plus its gap), so motion scales with the board; times are in ms.
 * Tune them visually in /dev/motion and paste the result back.
 */
export const tokens = {
  spring: {
    /** Press, hover, cursor: tight, almost no overshoot. */
    snappy: { bounce: 0.05, duration: 160 },
    /** Tile entrance, typed letter: a light overshoot. */
    bouncy: { bounce: 0.35, duration: 420 },
    /** Moves along the chain, screen swaps: damped, no overshoot. */
    glide: { bounce: 0, duration: 520 },
  },
  stagger: {
    /** Letter to letter within a word. */
    letter: 28,
    /** Per cell of distance from the centre in board-wide waves. */
    wave: 12,
  },
  duration: {
    /** Error/success feedback. */
    flash: 180,
    /** Reduced-motion stand-in for springs, and the alpha part of entrances. */
    fade: 120,
    exit: 200,
    shake: 360,
    /** One timer beat. */
    tick: 240,
    /** One cursor breath (half the loop). */
    breathe: 600,
    ripple: 220,
  },
  distance: {
    /** How far a typed letter falls into its slot. */
    drop: 0.6,
    /** Hover ripple and turn-pulse lift. */
    lift: 0.12,
    /** Peak horizontal offset of an invalid-word shake. */
    shake: 0.18,
  },
  scale: {
    enter: 0.4,
    exit: 0.6,
    /** A slot emptied by backspace pops back from here. */
    erase: 0.85,
    typed: 0.6,
    press: 0.9,
    tick: 1.08,
    tickUrgent: 1.18,
  },
  damping: {
    /** Each swing of a shake is this fraction of the one before. */
    shake: 0.6,
  },
  opacity: {
    flash: 0.7,
    pulse: 0.45,
    /** Dimmest point of a cursor breath. */
    breathe: 0.25,
  },
} as const;

type Widen<T> = { -readonly [K in keyof T]: T[K] extends number ? number : Widen<T[K]> };

export type MotionTokens = Widen<typeof tokens>;
export type SpringName = keyof MotionTokens['spring'];

export function cloneTokens(source: MotionTokens = tokens): MotionTokens {
  return structuredClone(source) as MotionTokens;
}
