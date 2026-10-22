import { describe, expect, it, vi } from 'vitest';
import type { Batch, TileSpec, TileTone } from '@src/engine/types';
import { restMotion, type MotionContext } from './choreography';
import { Director, type MotionTarget } from './director';
import { cloneTokens, type MotionTokens } from './tokens';

// Real (short) time: anime runs its own loop here, no ticker is bound.
function fastTokens(): MotionTokens {
  const t = cloneTokens();
  for (const s of Object.values(t.spring)) s.duration = 30;
  for (const k of Object.keys(t.duration) as (keyof MotionTokens['duration'])[]) t.duration[k] = 30;
  t.stagger.wave = 1;
  t.stagger.letter = 1;
  return t;
}

class View implements MotionTarget {
  motion = restMotion();
  tone: TileTone | null = null;
  apply() {}
  leave() {}
  setFlashTone(tone: TileTone) {
    this.tone = tone;
  }
}

const spec = (key: string, col = 0, extra: Partial<TileSpec> = {}): TileSpec => ({ key, char: 'A', row: 0, col, ...extra });
const empty: Batch = { enter: [], update: [], exit: [] };

function setup(reduced = false, onStart?: () => void) {
  const ctx: MotionContext = { tokens: fastTokens(), reduced };
  return new Director<View>(() => ctx, onStart);
}

describe('Director', () => {
  it('plays an entrance to rest and reports when the board settles', async () => {
    const director = setup();
    const view = new View();
    const done = director.enter(view, spec('a'), empty);
    expect(view.motion.alpha).toBe(0);
    expect(director.active).toBe(2);
    await done;
    expect(view.motion).toMatchObject({ alpha: 1, scale: 1 });
    expect(director.active).toBe(0);
  });

  it('wakes the host loop on every start and stays busy while a loop breathes', async () => {
    let starts = 0;
    const director = setup(false, () => starts++);
    const view = new View();
    director.enter(view, spec('s', 0, { variant: 'slot', active: true }), empty);
    expect(starts).toBe(3);
    expect(director.started).toBe(3);
    await vi.waitFor(() => expect(director.active).toBe(0));
    expect(director.busy).toBe(true);
    director.cancel(view);
    expect(director.busy).toBe(false);
  });

  it('settles an exit so the layer can retire the tile', async () => {
    const director = setup();
    const view = new View();
    await director.exit(view, spec('a'), empty);
    expect(view.motion.alpha).toBe(0);
  });

  it('glides from the old cell and keeps an in-flight offset', async () => {
    const director = setup();
    const view = new View();
    view.motion.x = 0.5;
    const prev = spec('a', 3);
    const next = spec('a', 0);
    const done = director.update(view, prev, next, { ...empty, update: [{ prev, next }] });
    expect(view.motion.x).toBe(3.5);
    await done;
    expect(view.motion.x).toBe(0);
  });

  it('breathes the cursor until the slot stops being active, then rests it at full', async () => {
    const director = setup();
    const view = new View();
    const slot = spec('s', 0, { variant: 'slot', active: true });
    expect(director.enter(view, slot, empty)).toBeDefined();
    // The breath loops forever but doesn't count as motion in flight.
    await vi.waitFor(() => expect(director.active).toBe(0));
    const breathing = view.motion.caret;
    await new Promise((r) => setTimeout(r, 40));
    expect(view.motion.caret).not.toBe(breathing);
    director.update(view, slot, spec('s', 0, { variant: 'solid' }), empty);
    expect(view.motion.caret).toBe(1);
    // The letter drop still plays; once it lands nothing is left breathing.
    await vi.waitFor(() => expect(director.active).toBe(0));
    expect(view.motion.caret).toBe(1);
  });

  it('tints the overlay for effects and only touches the targeted word', async () => {
    const director = setup();
    const hit = new View();
    const miss = new View();
    director.play({ type: 'shake', word: 'in' }, [
      { view: hit, spec: spec('in:0') },
      { view: miss, spec: spec('out:0') },
    ]);
    expect(hit.tone).toBe('rose');
    expect(miss.tone).toBeNull();
    expect(director.active).toBe(2);
    await new Promise((r) => setTimeout(r, 80));
    expect(hit.motion).toMatchObject({ flash: 0, nudge: 0 });
  });

  it('cancels everything on a view, so a recycled tile never gets stale tweens', async () => {
    const director = setup();
    const view = new View();
    director.enter(view, spec('a'), empty);
    director.cancel(view);
    expect(director.active).toBe(0);
    view.motion.alpha = 0.3;
    await new Promise((r) => setTimeout(r, 60));
    expect(view.motion.alpha).toBe(0.3);
  });

  it('fades without travel under reduced motion', async () => {
    const director = setup(true);
    const view = new View();
    const prev = spec('a', 3);
    expect(director.update(view, prev, spec('a', 0), empty)).toBeUndefined();
    expect(view.motion.x).toBe(0);
    director.press([view], true);
    expect(view.motion.press).toBe(1);
  });
});
