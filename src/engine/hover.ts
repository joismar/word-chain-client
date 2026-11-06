import type { EngineEvent, TileSpec } from './types';

/**
 * Turns per-tile pointerover/out into one hover stream. Pixi fires `out` on
 * the old tile before `over` on the next, so clearing waits a microtask.
 */
export class HoverTracker {
  private current: { action: string; key: string } | null = null;
  private leaving = false;

  constructor(
    private readonly emit: (event: EngineEvent) => void,
    private readonly defer: (fn: () => void) => void = (fn) => queueMicrotask(fn),
  ) {}

  over(spec: TileSpec) {
    this.leaving = false;
    if (!spec.action || this.current?.key === spec.key) return;
    this.current = { action: spec.action, key: spec.key };
    this.emit({ type: 'hover', ...this.current });
  }

  out(spec: TileSpec) {
    if (this.current?.key !== spec.key) return;
    this.leaving = true;
    this.defer(() => {
      if (this.leaving) this.clear();
    });
  }

  /** Drops the hover if its tile left or stopped being clickable. */
  prune(specs: readonly TileSpec[]) {
    if (!this.current) return;
    const key = this.current.key;
    const still = specs.find((s) => s.key === key);
    if (!still?.action) this.clear();
  }

  private clear() {
    this.leaving = false;
    if (!this.current) return;
    this.current = null;
    this.emit({ type: 'hover', action: null, key: null });
  }
}
