import { BitmapFont, BitmapFontManager, BitmapText, Container, Graphics, Rectangle } from 'pixi.js';
import { BOARD_SYMBOLS } from '@src/lib/sanitize';
import { restMotion, type TileMotion } from '@src/motion/choreography';
import { BOARD, SLOT_ALPHA, TONES } from '@src/theme/palette';
import { cellToPoint, type Board } from './layout';
import type { TileView } from './TileLayer';
import type { TileSpec, TileTone } from './types';

export const TILE_FONT = 'TileFont';
const FONT_SIZE = 48;
const FONT_WEIGHT = '600';
const FONT_FAMILY = '"Commit Mono", ui-monospace, "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace';

/**
 * Waits for Commit Mono (bundled through @fontsource): the glyph atlas is
 * drawn once, so drawing it before the font arrives would bake in the fallback.
 */
export async function loadTileFont() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await document.fonts.load(`${FONT_WEIGHT} ${FONT_SIZE}px "Commit Mono"`).catch(() => {});
}

/** Installs the white glyph atlas every tile tints. Call once per renderer. */
export function installTileFont(resolution: number) {
  BitmapFont.install({
    name: TILE_FONT,
    chars: [...BitmapFontManager.ALPHANUMERIC, BOARD_SYMBOLS],
    resolution,
    padding: 6,
    dynamicFill: true,
    style: {
      fontFamily: FONT_FAMILY,
      fontSize: FONT_SIZE,
      fontWeight: FONT_WEIGHT,
      fill: 0xffffff,
    },
  });
}

export type TilePointer = 'tap' | 'over' | 'out' | 'down' | 'up';

/**
 * One letter cell: a flat face and its glyph (an empty slot is the face at
 * low opacity). The tile
 * itself sits on its cell and owns the hit area; `body` carries the drawing
 * and takes the motion channels, so animation never moves what you click.
 */
export class Tile extends Container implements TileView {
  spec: TileSpec | null = null;
  /** Animated by the director; applied on every render. */
  readonly motion: TileMotion = restMotion();
  private readonly body = new Container();
  private readonly face = new Graphics();
  private readonly caret = new Graphics();
  private readonly overlay = new Graphics();
  private readonly glyph = new BitmapText({ text: '', style: { fontFamily: TILE_FONT, fontSize: FONT_SIZE }, anchor: 0.5 });
  private drawn = '';
  private pitch = 0;

  constructor(onPointer: (kind: TilePointer, spec: TileSpec) => void) {
    super();
    this.body.addChild(this.face, this.caret, this.glyph, this.overlay);
    this.addChild(this.body);
    this.overlay.alpha = 0;
    const forward = (kind: TilePointer) => () => {
      if (this.spec?.action) onPointer(kind, this.spec);
    };
    this.on('pointertap', forward('tap'));
    this.on('pointerover', forward('over'));
    this.on('pointerout', forward('out'));
    this.on('pointerdown', forward('down'));
    this.on('pointerup', forward('up'));
    this.on('pointerupoutside', forward('up'));
    this.onRender = () => this.applyMotion();
  }

  apply(spec: TileSpec, board: Board) {
    this.spec = spec;
    this.pitch = board.pitch;
    const { x, y } = cellToPoint(board, spec.row, spec.col);
    this.position.set(x, y);
    this.redraw(spec, board.cell);

    this.glyph.text = spec.variant === 'slot' ? '' : spec.char;
    this.glyph.tint = TONES[spec.tone ?? 'stone'].text;
    this.glyph.style.fontSize = board.cell * 0.55;

    // The hit area covers the gap too, so a word reads as one button.
    const interactive = !!spec.action;
    this.eventMode = interactive ? 'static' : 'passive';
    this.cursor = interactive ? 'pointer' : 'default';
    this.hitArea = interactive ? new Rectangle(-board.pitch / 2, -board.pitch / 2, board.pitch, board.pitch) : null;
    this.applyMotion();
  }

  /** Stops answering the pointer while an exit plays. */
  leave() {
    this.eventMode = 'none';
    this.cursor = 'default';
  }

  /** Colour of the flash overlay. */
  setFlashTone(tone: TileTone) {
    this.overlay.tint = TONES[tone].face;
  }

  /** Back to a blank state before returning to the pool. */
  reset() {
    this.spec = null;
    this.eventMode = 'passive';
    this.hitArea = null;
    Object.assign(this.motion, restMotion());
    this.applyMotion();
  }

  private applyMotion() {
    const m = this.motion;
    this.body.position.set((m.x + m.nudge) * this.pitch, (m.y + m.lift) * this.pitch);
    this.body.scale.set(m.scale * m.press * m.pulse);
    this.body.alpha = m.alpha;
    this.overlay.alpha = m.flash;
    this.caret.alpha = m.caret;
  }

  private redraw(spec: TileSpec, cell: number) {
    const key = `${spec.tone}|${spec.variant}|${spec.active}|${cell}`;
    if (key === this.drawn) return;
    this.drawn = key;
    const tone = TONES[spec.tone ?? 'stone'];
    const half = cell / 2;
    const radius = Math.max(1, cell * 0.08);

    this.face.clear().roundRect(-half, -half, cell, cell, radius)
      .fill({ color: tone.face, alpha: spec.variant === 'slot' ? SLOT_ALPHA : 1 });
    this.overlay.clear().roundRect(-half, -half, cell, cell, radius).fill(0xffffff);
    this.caret.clear();
    if (spec.variant === 'slot' && spec.active) {
      this.caret.roundRect(-half + cell * 0.15, half - cell * 0.28, cell * 0.7, cell * 0.08, radius).fill(BOARD.cursor);
    }
  }
}
