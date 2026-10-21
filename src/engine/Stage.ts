import { Application, BitmapFontManager, Container } from 'pixi.js';
import { BOARD } from '@src/theme/palette';
import { BoardBackground } from './Board';
import { HoverTracker } from './hover';
import { computeBoard, type Board, type BoardOptions, type Viewport } from './layout';
import { Pool } from './pool';
import { installTileFont, Tile, TILE_FONT } from './Tile';
import { TileLayer, type Choreography } from './TileLayer';
import type { EngineEvent, TileSpec } from './types';

export interface StageOptions {
  viewport: Viewport;
  onEvent?: (event: EngineEvent) => void;
  board?: BoardOptions;
  choreography?: Partial<Choreography<Tile>>;
}

// Pixi keeps global pools and caches; overlapping apps (StrictMode mounts
// twice) would tear each other's resources down, so lifecycles run in turn.
let lifecycle: Promise<unknown> = Promise.resolve();

/** The Pixi application: board background, tile layer and pointer events. */
export class Stage {
  private readonly world = new Container();
  private readonly background = new BoardBackground();
  private readonly tiles = new Container();
  private readonly layer: TileLayer<Tile>;
  private readonly hover: HoverTracker;
  private specs: readonly TileSpec[] = [];
  private current: Board;
  private destroyed = false;

  /** Resolves to null when `signal` aborts before the renderer is ready. */
  static create(host: HTMLElement, options: StageOptions, signal?: AbortSignal): Promise<Stage | null> {
    const run = lifecycle.then(async () => {
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
    const emit = (event: EngineEvent) => options.onEvent?.(event);
    this.hover = new HoverTracker(emit);
    this.current = computeBoard(options.viewport, options.board);

    const pool = new Pool<Tile>(
      () => new Tile((kind, spec) => {
        if (kind === 'tap') emit({ type: 'tap', action: spec.action!, key: spec.key });
        else if (kind === 'over') this.hover.over(spec);
        else this.hover.out(spec);
      }),
      (tile) => tile.reset(),
      (tile) => tile.destroy({ children: true }),
    );
    this.layer = new TileLayer<Tile>({
      pool,
      mount: (tile) => this.tiles.addChild(tile),
      unmount: (tile) => this.tiles.removeChild(tile),
      choreography: options.choreography,
    });

    this.world.addChild(this.background, this.tiles);
    app.stage.addChild(this.world);
    this.layout();
  }

  get board(): Board {
    return this.current;
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  setTiles(specs: readonly TileSpec[]) {
    if (this.destroyed) return;
    this.specs = specs;
    this.layer.sync(specs, this.current);
    this.hover.prune(specs);
    // Hit-testing reads world transforms, which only refresh on render; draw
    // now so a click right after a change lands on the new layout.
    this.app.render();
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
    this.app.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
    BitmapFontManager.uninstall(TILE_FONT);
  }

  private layout() {
    this.world.position.set(this.current.originX, this.current.originY);
    this.background.draw(this.current);
  }
}
