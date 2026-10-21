import { joinTiles } from './join';
import type { Board } from './layout';
import type { Pool } from './pool';
import type { TileSpec } from './types';

export interface TileView {
  apply(spec: TileSpec, board: Board): void;
}

type Step = Promise<void> | void;

/** Hooks for animating tiles. Without them changes land instantly (F3 plugs motion in). */
export interface Choreography<V extends TileView> {
  enter(view: V, spec: TileSpec): Step;
  update(view: V, prev: TileSpec, next: TileSpec): Step;
  /** The tile stays mounted until this settles. */
  exit(view: V, spec: TileSpec): Step;
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

  sync(specs: readonly TileSpec[], board: Board) {
    if (this.destroyed) return;
    if (board !== this.board) this.relayout(board);
    const specsByKey = new Map([...this.live].map(([key, entry]) => [key, entry.spec]));
    const { enter, update, exit } = joinTiles(specsByKey, specs);
    const { pool, mount, choreography } = this.options;

    for (const key of exit) {
      const { view, spec } = this.live.get(key)!;
      this.live.delete(key);
      this.leaving.add(view);
      const done = choreography?.exit?.(view, spec);
      if (done) done.then(() => this.retire(view), () => this.retire(view));
      else this.retire(view);
    }
    for (const spec of update) {
      const entry = this.live.get(spec.key)!;
      const prev = entry.spec;
      entry.spec = spec;
      entry.view.apply(spec, board);
      choreography?.update?.(entry.view, prev, spec);
    }
    for (const spec of enter) {
      const view = pool.acquire();
      view.apply(spec, board);
      mount(view);
      this.live.set(spec.key, { view, spec });
      choreography?.enter?.(view, spec);
    }
  }

  /** Re-applies every live tile to a new board (resize, DPR change). */
  relayout(board: Board) {
    this.board = board;
    for (const { view, spec } of this.live.values()) view.apply(spec, board);
  }

  destroy() {
    this.destroyed = true;
    const { pool, unmount } = this.options;
    for (const view of [...this.leaving, ...[...this.live.values()].map((e) => e.view)]) {
      unmount(view);
      pool.discard(view);
    }
    this.live.clear();
    this.leaving.clear();
    pool.drain();
  }

  private retire(view: V) {
    if (!this.leaving.delete(view)) return;
    this.options.unmount(view);
    this.options.pool.release(view);
  }
}
