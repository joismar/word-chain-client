import { animate, spring, utils, type AnimationParams, type JSAnimation } from 'animejs';
import type { Choreography, TileView } from '@src/engine/TileLayer';
import type { Batch, TileSpec, TileTone } from '@src/engine/types';
import {
  planEffect, planEnter, planExit, planPress, planRipple, planUpdate,
  type Channel, type MotionContext, type MotionEffect, type TileMotion, type Tween,
} from './choreography';

/** A view the director can animate: motion channels plus an overlay colour. */
export interface MotionTarget extends TileView {
  readonly motion: TileMotion;
  setFlashTone(tone: TileTone): void;
}

type Live<V> = Iterable<{ view: V; spec: TileSpec }>;

/** Runs choreography plans with anime.js and keeps track of what is in flight. */
export class Director<V extends MotionTarget> implements Choreography<V> {
  private readonly running = new Map<V, Set<JSAnimation>>();
  /** Endless loops (cursor breath) don't keep the board from being at rest. */
  private readonly idle = new WeakSet<JSAnimation>();
  private startedCount = 0;

  /** `onStart` fires whenever an animation starts, so the host can wake its loop. */
  constructor(private readonly context: () => MotionContext, private readonly onStart: () => void = () => {}) {}

  /** Transitions still playing; 0 means the board is at rest. */
  get active(): number {
    return this.count(false);
  }

  /** Animations started since creation (for tests and the playground). */
  get started(): number {
    return this.startedCount;
  }

  /** Anything playing at all, endless loops included: the ticker must run. */
  get busy(): boolean {
    return this.count(true) > 0;
  }

  enter(view: V, spec: TileSpec, batch: Batch) {
    return this.run(view, planEnter(spec, batch, this.context()));
  }

  update(view: V, prev: TileSpec, next: TileSpec, batch: Batch) {
    return this.run(view, planUpdate(prev, next, batch, this.context()));
  }

  exit(view: V, spec: TileSpec, batch: Batch) {
    return this.run(view, planExit(spec, batch, this.context()));
  }

  cancel(view: V) {
    for (const anim of this.running.get(view) ?? []) anim.cancel();
    this.running.delete(view);
  }

  play(effect: MotionEffect, live: Live<V>) {
    const entries = [...live];
    const plans = planEffect(effect, entries.map((e) => e.spec), this.context());
    for (const { view, spec } of entries) {
      const tweens = plans.get(spec.key);
      if (tweens) this.run(view, tweens);
    }
  }

  /** Hover entered a word at `fromKey`. */
  ripple(word: Live<V>, fromKey: string) {
    const entries = [...word];
    const plans = planRipple(entries.map((e) => e.spec), fromKey, this.context());
    for (const { view, spec } of entries) {
      const tweens = plans.get(spec.key);
      if (tweens) this.run(view, tweens);
    }
  }

  press(views: Iterable<V>, down: boolean) {
    const tweens = planPress(down, this.context());
    for (const view of views) this.run(view, tweens);
  }

  destroy() {
    for (const view of [...this.running.keys()]) this.cancel(view);
  }

  private count(includeIdle: boolean): number {
    let count = 0;
    for (const [view, set] of this.running) {
      for (const anim of set) {
        if (anim.completed || anim.cancelled) set.delete(anim);
        else if (includeIdle || !this.idle.has(anim)) count++;
      }
      if (!set.size) this.running.delete(view);
    }
    return count;
  }

  /** Starts every tween; the promise settles when all of them finish. */
  private run(view: V, tweens: readonly Tween[]): Promise<void> | undefined {
    const { tokens } = this.context();
    const motion = view.motion;
    const done: Promise<void>[] = [];

    for (const tween of tweens) {
      if (tween.add) {
        for (const [channel, value] of Object.entries(tween.add) as [Channel, number][]) motion[channel] += value;
      }
      if (tween.from) Object.assign(motion, tween.from);
      if (tween.tint) view.setFlashTone(tween.tint);

      const { timing } = tween;
      if ('duration' in timing && timing.duration === 0) {
        for (const [channel, value] of Object.entries(tween.to) as [Channel, number | number[]][]) {
          utils.remove(motion, undefined, channel);
          motion[channel] = Array.isArray(value) ? value.at(-1)! : value;
        }
        continue;
      }

      const params: AnimationParams = { ...tween.to, delay: tween.delay ?? 0 };
      if ('spring' in timing) {
        params.ease = spring(tokens.spring[timing.spring]);
      } else {
        params.duration = timing.duration;
        params.ease = timing.ease ?? 'outQuad';
      }
      if (tween.breathe) {
        params.loop = true;
        params.alternate = true;
      }
      const anim = animate(motion, params);
      this.startedCount++;
      this.onStart();
      let set = this.running.get(view);
      if (!set) this.running.set(view, (set = new Set()));
      set.add(anim);
      if (tween.breathe) this.idle.add(anim);
      else done.push(new Promise((resolve) => void anim.then(() => resolve())));
    }
    return done.length ? Promise.all(done).then(() => {}) : undefined;
  }
}
