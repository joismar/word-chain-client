import { Application, Container, UPDATE_PRIORITY } from 'pixi.js';
import { effectTargets, type MotionEffect } from '@src/motion/choreography';
import { Director } from '@src/motion/director';
import { prefersReducedMotion, watchReducedMotion } from '@src/motion/reduced';
import { bindAnimeToTicker } from '@src/motion/ticker-bridge';
import { tokens as defaultTokens, type MotionTokens } from '@src/motion/tokens';
import { BOARD } from '@src/theme/palette';
import { BoardBackground, coveredCells } from './Board';
import { FxLayer } from './FxLayer';
import { HoverTracker } from './hover';
import { computeBoard, type Board, type BoardOptions, type Viewport } from './layout';
import { Pool } from './pool';
import { installTileFont, loadTileFont, Tile, uninstallTileFont } from './Tile';
import { TileLayer } from './TileLayer';
import type { EngineEvent, TileSpec } from './types';

export interface MotionOptions {
  tokens?: MotionTokens;
  /** Forces reduced motion on or off; unset follows the OS setting. */
  reduced?: boolean;
}

export interface StageOptions {
  viewport: Viewport;
  onEvent?: (event: EngineEvent) => void;
  board?: BoardOptions;
  motion?: MotionOptions;
}

// Pixi keeps global pools and caches; overlapping apps (StrictMode mounts
// twice) would tear each other's resources down, so lifecycles run in turn.
let lifecycle: Promise<unknown> = Promise.resolve();

/** The Pixi application: board background, tile layer, pointer events and motion. */
export class Stage {
  private readonly world = new Container();
  private readonly background = new BoardBackground();
  private readonly tiles = new Container();
  private readonly layer: TileLayer<Tile>;
  private readonly hover: HoverTracker;
  private readonly director: Director<Tile>;
  private readonly fx: FxLayer;
  private readonly unbindTicker: () => void;
  private readonly unwatchReduced: () => void;
  private motionTokens: MotionTokens;
  private reducedOverride: boolean | undefined;
  private systemReduced = prefersReducedMotion();
  private hoveredAction: string | null = null;
  private specs: readonly TileSpec[] = [];
  private current: Board;
  private destroyed = false;

  /** Resolves to null when `signal` aborts before the renderer is ready. */
  static create(host: HTMLElement, options: StageOptions, signal?: AbortSignal): Promise<Stage | null> {
    const run = lifecycle.then(async () => {
      if (signal?.aborted) return null;
      await loadTileFont();
      if (signal?.aborted) return null;
      const app = new Application();
      await app.init({
        width: Math.max(1, options.viewport.width),
        height: Math.max(1, options.viewport.height),
        background: BOARD.background,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
        preference: 'webgpu',
        // Frames are drawn on demand: on changes, and while something animates.
        autoStart: false,
      });
      const stage = new Stage(app, options);
      if (signal?.aborted) {
        stage.destroy();
        return null;
      }
      host.appendChild(app.canvas);
      return stage;
    });
    lifecycle = run.catch(() => {});
    return run;
  }

  private constructor(private readonly app: Application, private readonly options: StageOptions) {
    installTileFont(app.renderer.resolution);
    this.motionTokens = options.motion?.tokens ?? defaultTokens;
    this.reducedOverride = options.motion?.reduced;
    this.unwatchReduced = watchReducedMotion((reduced) => (this.systemReduced = reduced));
    const context = () => ({ tokens: this.motionTokens, reduced: this.reducedOverride ?? this.systemReduced });
    const wake = () => {
      if (!this.destroyed && !app.ticker.started) app.ticker.start();
    };
    this.director = new Director<Tile>(context, wake);
    this.fx = new FxLayer(context, wake);
    this.unbindTicker = bindAnimeToTicker(app.ticker);
    app.ticker.add(() => this.fx.update(this.current));
    // After the frame is drawn, sleep until the next animation starts.
    app.ticker.add(() => {
      if (!this.director.busy && !this.fx.busy) app.ticker.stop();
    }, undefined, UPDATE_PRIORITY.UTILITY);

    this.hover = new HoverTracker((event) => {
      if (event.type === 'hover') this.onHover(event.action, event.key);
      options.onEvent?.(event);
    });
    this.current = computeBoard(options.viewport, options.board);

    const pool = new Pool<Tile>(
      () => new Tile((kind, spec) => {
        if (kind === 'tap') options.onEvent?.({ type: 'tap', action: spec.action!, key: spec.key });
        else if (kind === 'over') this.hover.over(spec);
        else if (kind === 'out') this.hover.out(spec);
        else this.director.press(this.viewsOf(spec.action!), kind === 'down');
      }),
      (tile) => tile.reset(),
      (tile) => tile.destroy({ children: true }),
    );
    this.layer = new TileLayer<Tile>({
      pool,
      mount: (tile) => this.tiles.addChild(tile),
      unmount: (tile) => this.tiles.removeChild(tile),
      choreography: this.director,
    });

    this.world.addChild(this.background, this.fx.under, this.tiles, this.fx.over);
    app.stage.addChild(this.world);
    this.layout();
  }

  get board(): Board {
    return this.current;
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  /** Transitions in flight (0 when the board is at rest) and how many ever started. */
  get motionStats(): { active: number; started: number } {
    return { active: this.director.active, started: this.director.started };
  }

  setTiles(specs: readonly TileSpec[]) {
    if (this.destroyed) return;
    this.specs = specs;
    const changed = this.layer.sync(specs, this.current);
    this.background.draw(this.current, coveredCells(specs));
    this.hover.prune(specs);
    // Hit-testing reads world transforms, which only refresh on render; draw
    // now so a click right after a change lands on the new layout.
    if (changed) this.app.render();
  }

  /** One-off feedback on top of the tile join (shake, flash, turn pulse, timer, chain link). */
  play(effect: MotionEffect) {
    if (this.destroyed) return;
    if (effect.type === 'link') {
      this.fx.burst(effectTargets(effect, [...this.layer.entries()].map((e) => e.spec)), effect.tone);
      return;
    }
    this.director.play(effect, this.layer.entries());
    if (effect.type === 'pulse') this.fx.pulse(effect.tone, this.current);
  }

  setMotion(options: MotionOptions) {
    if ('tokens' in options) this.motionTokens = options.tokens ?? defaultTokens;
    if ('reduced' in options) this.reducedOverride = options.reduced;
  }

  resize(viewport: Viewport) {
    if (this.destroyed) return;
    const next = computeBoard(viewport, this.options.board);
    if (next.width === this.current.width && next.height === this.current.height) return;
    this.current = next;
    this.app.renderer.resize(Math.max(1, next.width), Math.max(1, next.height));
    this.layout();
    this.layer.sync(this.specs, next);
    this.app.render();
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.layer.destroy();
    this.director.destroy();
    this.fx.destroy();
    this.unbindTicker();
    this.unwatchReduced();
    this.app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
    uninstallTileFont();
  }

  private onHover(action: string | null, key: string | null) {
    const entered = action !== null && action !== this.hoveredAction;
    this.hoveredAction = action;
    if (!entered) return;
    this.director.ripple([...this.layer.entries()].filter((e) => e.spec.action === action), key!);
  }

  private viewsOf(action: string): Tile[] {
    return [...this.layer.entries()].filter((e) => e.spec.action === action).map((e) => e.view);
  }

  private layout() {
    this.world.position.set(this.current.originX, this.current.originY);
    this.background.draw(this.current, coveredCells(this.specs));
  }
}
