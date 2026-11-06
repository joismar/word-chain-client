import { joinTiles } from './join';
import type { Board } from './layout';
import type { Pool } from './pool';
import type { Batch, TileSpec } from './types';

export interface TileView {
  apply(spec: TileSpec, board: Board): void;
  /** Called as the tile starts exiting: it must stop taking input. */
  leave(): void;
}

type Step = Promise<void> | void;

/** Hooks for animating tiles. Without them changes land instantly. */
export interface Choreography<V extends TileView> {
  enter(view: V, spec: TileSpec, batch: Batch): Step;
  update(view: V, prev: TileSpec, next: TileSpec, batch: Batch): Step;
  /** The tile stays mounted until this settles. */
  exit(view: V, spec: TileSpec, batch: Batch): Step;
  /** Stops whatever runs on a view before it goes back to the pool or dies. */
  cancel(view: V): void;
}

export interface TileLayerOptions<V extends TileView> {
  pool: Pool<V>;
  mount(view: V): void;
  unmount(view: V): void;
  choreography?: Partial<Choreography<V>>;
}

/** Keeps one view per tile key in sync with the latest specs. */
export class TileLayer<V extends TileView> {
  private live = new Map<string, { view: V; spec: TileSpec }>();
  private leaving = new Set<V>();
  private board: Board | null = null;
  private destroyed = false;

  constructor(private readonly options: TileLayerOptions<V>) {}

  get(key: string): V | undefined {
    return this.live.get(key)?.view;
  }

  /** Live (not exiting) tiles with their current spec. */
  entries(): IterableIterator<{ view: V; spec: TileSpec }> {
    return this.live.values();
  }

  /** Returns whether anything on the board changed. */
  sync(specs: readonly TileSpec[], board: Board): boolean {
    if (this.destroyed) return false;
    const resized = board !== this.board;
    if (resized) this.relayout(board);
    const specsByKey = new Map([...this.live].map(([key, entry]) => [key, entry.spec]));
    const join = joinTiles(specsByKey, specs);
    const { pool, mount, choreography } = this.options;
    const batch: Batch = {
      enter: join.enter,
      update: join.update.map((next) => ({ prev: specsByKey.get(next.key)!, next })),
      exit: join.exit.map((key) => specsByKey.get(key)!),
    };

    for (const key of join.exit) {
      const { view, spec } = this.live.get(key)!;
      this.live.delete(key);
      this.leaving.add(view);
      view.leave();
      const done = choreography?.exit?.(view, spec, batch);
      if (done) done.then(() => this.retire(view), () => this.retire(view));
      else this.retire(view);
    }
    for (const { prev, next } of batch.update) {
      const entry = this.live.get(next.key)!;
      entry.spec = next;
      entry.view.apply(next, board);
      choreography?.update?.(entry.view, prev, next, batch);
    }
    for (const spec of join.enter) {
      const view = pool.acquire();
      view.apply(spec, board);
      mount(view);
      this.live.set(spec.key, { view, spec });
      choreography?.enter?.(view, spec, batch);
    }
    return resized || join.enter.length + join.update.length + join.exit.length > 0;
  }

  /** Re-applies every live tile to a new board (resize, DPR change). */
  relayout(board: Board) {
    this.board = board;
    for (const { view, spec } of this.live.values()) view.apply(spec, board);
  }

  destroy() {
    this.destroyed = true;
    const { pool, unmount, choreography } = this.options;
    for (const view of [...this.leaving, ...[...this.live.values()].map((e) => e.view)]) {
      choreography?.cancel?.(view);
      unmount(view);
      pool.discard(view);
    }
    this.live.clear();
    this.leaving.clear();
    pool.drain();
  }

  private retire(view: V) {
    if (!this.leaving.delete(view)) return;
    this.options.choreography?.cancel?.(view);
    this.options.unmount(view);
    this.options.pool.release(view);
  }
}
