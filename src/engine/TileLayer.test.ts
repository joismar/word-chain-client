import { describe, expect, it } from 'vitest';
import { computeBoard, type Board } from './layout';
import { Pool } from './pool';
import { TileLayer, type Choreography, type TileView } from './TileLayer';
import type { TileSpec } from './types';

class FakeView implements TileView {
  static made = 0;
  id = ++FakeView.made;
  spec: TileSpec | null = null;
  board: Board | null = null;
  destroyed = false;
  apply(spec: TileSpec, board: Board) {
    this.spec = spec;
    this.board = board;
  }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

function setup(choreography?: Partial<Choreography<FakeView>>) {
  const mounted = new Set<FakeView>();
  const pool = new Pool(() => new FakeView(), (v) => (v.spec = null), (v) => (v.destroyed = true));
  const layer = new TileLayer<FakeView>({
    pool,
    mount: (v) => mounted.add(v),
    unmount: (v) => mounted.delete(v),
    choreography,
  });
  return { layer, pool, mounted };
}

const board = computeBoard({ width: 800, height: 600 });
const tile = (key: string, char = 'A', col = 0): TileSpec => ({ key, char, row: 0, col });

describe('TileLayer', () => {
  it('mounts entering tiles and applies their spec', () => {
    const { layer, mounted } = setup();
    layer.sync([tile('a'), tile('b', 'B', 1)], board);
    expect(mounted.size).toBe(2);
    expect(layer.get('b')?.spec).toEqual(tile('b', 'B', 1));
  });

  it('updates a tile in place when its key survives', () => {
    const { layer } = setup();
    layer.sync([tile('a')], board);
    const view = layer.get('a');
    layer.sync([tile('a', 'Z', 4)], board);
    expect(layer.get('a')).toBe(view);
    expect(view?.spec?.char).toBe('Z');
  });

  it('unmounts exiting tiles and recycles them through the pool', () => {
    const { layer, pool, mounted } = setup();
    layer.sync([tile('a')], board);
    const view = layer.get('a')!;
    layer.sync([], board);
    expect(mounted.has(view)).toBe(false);
    expect(pool.size).toBe(1);
    layer.sync([tile('b')], board);
    expect(layer.get('b')).toBe(view);
  });

  it('keeps an exiting tile on screen until its exit choreography ends', async () => {
    const exit = deferred();
    const { layer, mounted } = setup({ exit: () => exit.promise });
    layer.sync([tile('a')], board);
    const old = layer.get('a')!;
    layer.sync([], board);
    expect(mounted.has(old)).toBe(true);
    expect(layer.get('a')).toBeUndefined();

    // The same key can come back while the old tile is still leaving.
    layer.sync([tile('a')], board);
    expect(layer.get('a')).not.toBe(old);
    exit.resolve();
    await exit.promise;
    await Promise.resolve();
    expect(mounted.has(old)).toBe(false);
    expect(mounted.has(layer.get('a')!)).toBe(true);
  });

  it('runs enter and update choreographies with the previous spec', () => {
    const calls: string[] = [];
    const { layer } = setup({
      enter: (_v, spec) => void calls.push(`enter ${spec.key}`),
      update: (_v, prev, next) => void calls.push(`update ${prev.char}->${next.char}`),
    });
    layer.sync([tile('a')], board);
    layer.sync([tile('a', 'B')], board);
    expect(calls).toEqual(['enter a', 'update A->B']);
  });

  it('re-applies every tile on a new board', () => {
    const { layer } = setup();
    layer.sync([tile('a')], board);
    const next = computeBoard({ width: 320, height: 640 });
    layer.relayout(next);
    expect(layer.get('a')?.board).toBe(next);
  });

  it('destroys live, exiting and pooled tiles on destroy', async () => {
    const exit = deferred();
    const { layer, mounted } = setup({ exit: () => exit.promise });
    layer.sync([tile('a'), tile('b')], board);
    const leaving = layer.get('a')!;
    const staying = layer.get('b')!;
    layer.sync([tile('b')], board);
    layer.destroy();
    expect(mounted.size).toBe(0);
    expect(staying.destroyed).toBe(true);
    expect(leaving.destroyed).toBe(true);
    exit.resolve();
    await exit.promise;
    expect(mounted.size).toBe(0);
  });
});
