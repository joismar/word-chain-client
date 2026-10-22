import { animate, engine } from 'animejs';
import { describe, expect, it } from 'vitest';
import { bindAnimeToTicker, type TickerLike } from './ticker-bridge';

class FakeTicker implements TickerLike {
  fns = new Set<() => void>();
  priorities: number[] = [];
  add(fn: () => void, _ctx: undefined, priority: number) {
    this.fns.add(fn);
    this.priorities.push(priority);
  }
  remove(fn: () => void) {
    this.fns.delete(fn);
  }
  tick() {
    for (const fn of this.fns) fn();
  }
}

// anime captures Date.now at import, so fake timers can't drive it.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('bindAnimeToTicker', () => {
  it('turns off the anime loop while any ticker is bound', () => {
    const a = new FakeTicker();
    const b = new FakeTicker();
    const unbindA = bindAnimeToTicker(a);
    const unbindB = bindAnimeToTicker(b);
    expect(engine.useDefaultMainLoop).toBe(false);
    unbindA();
    unbindA();
    expect(engine.useDefaultMainLoop).toBe(false);
    unbindB();
    expect(engine.useDefaultMainLoop).toBe(true);
    expect(a.fns.size + b.fns.size).toBe(0);
  });

  it('runs before the render and advances tweens only on ticks', async () => {
    const ticker = new FakeTicker();
    const unbind = bindAnimeToTicker(ticker);
    // Pixi renders at UPDATE_PRIORITY.LOW (-25); tweens must be computed first.
    expect(ticker.priorities[0]).toBeGreaterThan(-25);

    const target = { x: 0 };
    animate(target, { x: 100, duration: 60, ease: 'linear' });
    await sleep(20);
    expect(target.x).toBe(0);
    ticker.tick();
    expect(target.x).toBeGreaterThan(0);
    await sleep(80);
    ticker.tick();
    expect(target.x).toBe(100);
    unbind();
  });
});
