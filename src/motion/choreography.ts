import type { Batch, TileSpec, TileTone } from '@src/engine/types';
import type { MotionTokens, SpringName } from './tokens';

/**
 * What a tile exposes to motion. Each channel composes with the layout
 * instead of overwriting it, so a shake, a glide and a hover lift can run at
 * once. Offsets are in board pitches; the tile turns them into pixels.
 */
export interface TileMotion {
  /** FLIP offset from the laid-out cell, decays to 0 on a move. */
  x: number;
  y: number;
  /** Vertical bump (hover ripple, typed letter falling, turn pulse). */
  lift: number;
  /** Horizontal bump (shake). */
  nudge: number;
  scale: number;
  press: number;
  pulse: number;
  alpha: number;
  /** Opacity of the coloured overlay. */
  flash: number;
  /** Opacity of the input cursor. */
  caret: number;
}

export type Channel = keyof TileMotion;

export const restMotion = (): TileMotion => ({
  x: 0, y: 0, lift: 0, nudge: 0, scale: 1, press: 1, pulse: 1, alpha: 1, flash: 0, caret: 1,
});

export type Timing =
  | { spring: SpringName }
  /** `ease` is an anime.js ease name; duration 0 sets the values at once. */
  | { duration: number; ease?: string };

export interface Tween {
  /** Added to the current values first (FLIP: keeps an in-flight offset). */
  add?: Partial<TileMotion>;
  /** Set before the tween starts. */
  from?: Partial<TileMotion>;
  /** Targets; an array is a keyframe sequence over the whole duration. */
  to: Partial<Record<Channel, number | number[]>>;
  timing: Timing;
  delay?: number;
  /** Loops forever, back and forth (cursor breath). */
  breathe?: boolean;
  /** Overlay colour for the `flash` channel. */
  tint?: TileTone;
}

export interface MotionContext {
  tokens: MotionTokens;
  /** prefers-reduced-motion: springs become short fades, no travel. */
  reduced: boolean;
}

/** One-off feedback the scenes ask for, on top of the data join. */
export type MotionEffect =
  /** Invalid word: damped horizontal shake plus a rose flash. */
  | { type: 'shake'; word: string }
  | { type: 'flash'; word: string; tone: TileTone }
  /** Turn change: a pulse in the player's colour across every tile. */
  | { type: 'pulse'; tone: TileTone }
  /** Timer beat; `urgent` for the last seconds. */
  | { type: 'tick'; word: string; urgent?: boolean };

const distance = (spec: TileSpec) => Math.hypot(spec.row, spec.col);

/**
 * Delay for a board-wide wave from the centre cell. `out` grows with the
 * distance (entrances), `in` shrinks with it (exits). Relative to the batch,
 * so a lone tile starts at once wherever it is.
 */
export function waveDelay(spec: TileSpec, batch: readonly TileSpec[], direction: 'out' | 'in', perCell: number) {
  if (batch.length < 2) return 0;
  const ds = batch.map(distance);
  const d = distance(spec);
  return direction === 'out' ? (d - Math.min(...ds)) * perCell : (Math.max(...ds) - d) * perCell;
}

const fade = (tokens: MotionTokens, alpha: number, delay = 0): Tween => ({
  to: { alpha }, timing: { duration: tokens.duration.fade }, delay,
});

function caretTweens(spec: TileSpec, { tokens, reduced }: MotionContext): Tween[] {
  if (spec.variant !== 'slot' || !spec.active || reduced) return [];
  return [{
    from: { caret: 1 },
    to: { caret: tokens.opacity.breathe },
    timing: { duration: tokens.duration.breathe, ease: 'inOutSine' },
    breathe: true,
  }];
}

export function planEnter(spec: TileSpec, batch: Batch, ctx: MotionContext): Tween[] {
  const { tokens, reduced } = ctx;
  if (reduced) return [{ ...fade(tokens, 1), from: { alpha: 0 } }];
  const delay = waveDelay(spec, batch.enter, 'out', tokens.stagger.wave);
  return [
    { from: { alpha: 0 }, ...fade(tokens, 1, delay) },
    { from: { scale: tokens.scale.enter }, to: { scale: 1 }, timing: { spring: 'bouncy' }, delay },
    ...caretTweens(spec, ctx),
  ];
}

export function planUpdate(prev: TileSpec, next: TileSpec, batch: Batch, ctx: MotionContext): Tween[] {
  const { tokens, reduced } = ctx;
  const tweens: Tween[] = [];

  const dc = prev.col - next.col;
  const dr = prev.row - next.row;
  if ((dc || dr) && !reduced) {
    // Moving tiles start one after another, left to right (a word climbing the chain).
    const moved = batch.update.filter((u) => u.prev.col !== u.next.col || u.prev.row !== u.next.row);
    const first = Math.min(next.col, ...moved.map((u) => u.next.col));
    tweens.push({
      add: { x: dc, y: dr },
      to: { x: 0, y: 0 },
      timing: { spring: 'glide' },
      delay: (next.col - first) * tokens.stagger.letter,
    });
  }

  const typed = prev.variant === 'slot' && next.variant !== 'slot';
  const erased = prev.variant !== 'slot' && next.variant === 'slot';
  if (typed) {
    tweens.push(reduced
      ? { ...fade(tokens, 1), from: { alpha: 0 } }
      : {
        from: { lift: -tokens.distance.drop, scale: tokens.scale.typed },
        to: { lift: 0, scale: 1 },
        timing: { spring: 'bouncy' },
      });
  } else if (erased && !reduced) {
    tweens.push({ from: { scale: tokens.scale.erase }, to: { scale: 1 }, timing: { spring: 'snappy' } });
  }

  const wasBreathing = prev.variant === 'slot' && !!prev.active;
  const breathing = next.variant === 'slot' && !!next.active;
  if (breathing && !wasBreathing) tweens.push(...caretTweens(next, ctx));
  else if (wasBreathing && !breathing) tweens.push({ to: { caret: 1 }, timing: { duration: 0 } });
  return tweens;
}

export function planExit(spec: TileSpec, batch: Batch, { tokens, reduced }: MotionContext): Tween[] {
  if (reduced) return [fade(tokens, 0)];
  const delay = waveDelay(spec, batch.exit, 'in', tokens.stagger.wave);
  return [{
    to: { alpha: 0, scale: tokens.scale.exit },
    timing: { duration: tokens.duration.exit, ease: 'inQuad' },
    delay,
  }];
}

/** Which live tiles an effect touches. */
export function effectTargets(effect: MotionEffect, specs: readonly TileSpec[]): TileSpec[] {
  if (effect.type === 'pulse') return [...specs];
  const prefix = `${effect.word}:`;
  return specs.filter((s) => s.key.startsWith(prefix));
}

const flash = (tokens: MotionTokens, tone: TileTone, peak: number, delay = 0): Tween => ({
  to: { flash: [0, peak, 0] }, timing: { duration: tokens.duration.flash, ease: 'outQuad' }, tint: tone, delay,
});

/** Tweens per tile key for a one-off effect. */
export function planEffect(effect: MotionEffect, specs: readonly TileSpec[], { tokens, reduced }: MotionContext) {
  const plans = new Map<string, Tween[]>();
  const targets = effectTargets(effect, specs);
  for (const spec of targets) {
    const tweens: Tween[] = [];
    if (effect.type === 'shake') {
      tweens.push(flash(tokens, 'rose', tokens.opacity.flash));
      if (!reduced) {
        const a = tokens.distance.shake;
        const d = tokens.damping.shake;
        tweens.push({
          to: { nudge: [0, -a, a * d, -a * d ** 2, a * d ** 3, 0] },
          timing: { duration: tokens.duration.shake, ease: 'outSine' },
        });
      }
    } else if (effect.type === 'flash') {
      tweens.push(flash(tokens, effect.tone, tokens.opacity.flash));
    } else if (effect.type === 'pulse') {
      const delay = reduced ? 0 : waveDelay(spec, targets, 'out', tokens.stagger.wave);
      tweens.push(flash(tokens, effect.tone, tokens.opacity.pulse, delay));
      if (!reduced) {
        tweens.push({
          to: { lift: [0, -tokens.distance.lift, 0] },
          timing: { duration: tokens.duration.flash, ease: 'outSine' },
          delay,
        });
      }
    } else if (effect.type === 'tick') {
      if (effect.urgent) tweens.push(flash(tokens, 'rose', tokens.opacity.pulse));
      if (!reduced) {
        const peak = effect.urgent ? tokens.scale.tickUrgent : tokens.scale.tick;
        tweens.push({ to: { pulse: [1, peak, 1] }, timing: { duration: tokens.duration.tick, ease: 'outQuad' } });
      }
    }
    if (tweens.length) plans.set(spec.key, tweens);
  }
  return plans;
}

/** Hover: letters of a word bob in turn, outward from the one under the pointer. */
export function planRipple(word: readonly TileSpec[], fromKey: string, { tokens, reduced }: MotionContext) {
  const plans = new Map<string, Tween[]>();
  if (reduced) return plans;
  const origin = word.find((s) => s.key === fromKey);
  if (!origin) return plans;
  for (const spec of word) {
    const steps = Math.abs(spec.col - origin.col) + Math.abs(spec.row - origin.row);
    plans.set(spec.key, [{
      to: { lift: [0, -tokens.distance.lift, 0] },
      timing: { duration: tokens.duration.ripple, ease: 'outSine' },
      delay: steps * tokens.stagger.letter,
    }]);
  }
  return plans;
}

/** Press and release of a clickable word. */
export function planPress(down: boolean, { tokens, reduced }: MotionContext): Tween[] {
  if (reduced) return [];
  return [{ to: { press: down ? tokens.scale.press : 1 }, timing: { spring: 'snappy' } }];
}
