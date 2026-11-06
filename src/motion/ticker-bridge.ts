import { engine } from 'animejs';
import { UPDATE_PRIORITY } from 'pixi.js';

/** The slice of a Pixi `Ticker` the bridge needs. */
export interface TickerLike {
  add(fn: () => void, context: undefined, priority: number): unknown;
  remove(fn: () => void): unknown;
}

let bindings = 0;
const step = () => {
  engine.update();
};

/**
 * Drives anime.js from a Pixi ticker instead of its own rAF loop, so tweens
 * and rendering share one frame. Runs before the render (HIGH > LOW), which
 * means a frame always draws the values computed for it. Returns an unbind.
 */
export function bindAnimeToTicker(ticker: TickerLike): () => void {
  // The anime engine is global; StrictMode and remounts can overlap stages.
  if (bindings++ === 0) engine.useDefaultMainLoop = false;
  ticker.add(step, undefined, UPDATE_PRIORITY.HIGH);
  let bound = true;
  return () => {
    if (!bound) return;
    bound = false;
    ticker.remove(step);
    if (--bindings === 0) engine.useDefaultMainLoop = true;
  };
}
