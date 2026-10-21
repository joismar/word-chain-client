import { BitmapFont, BitmapFontManager, BitmapText, Container, Graphics, Rectangle } from 'pixi.js';
import { BOARD, TONES } from '@src/theme/palette';
import { cellToPoint, type Board } from './layout';
import type { TileView } from './TileLayer';
import type { TileSpec } from './types';

export const TILE_FONT = 'TileFont';
const FONT_SIZE = 48;

/** Installs the white glyph atlas every tile tints. Call once per renderer. */
export function installTileFont(resolution: number) {
  BitmapFont.install({
    name: TILE_FONT,
    chars: [...BitmapFontManager.ALPHANUMERIC, ' <>?!.,:;-_/+=*#↵←→'],
    resolution,
    padding: 6,
    dynamicFill: true,
    style: {
      fontFamily: 'ui-monospace, "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace',
      fontSize: FONT_SIZE,
      fontWeight: '600',
      fill: 0xffffff,
    },
  });
}

export type TilePointer = 'tap' | 'over' | 'out';

/** One letter cell: a shadow block, a raised face and its glyph. */
export class Tile extends Container implements TileView {
  spec: TileSpec | null = null;
  private readonly shadow = new Graphics();
  private readonly face = new Graphics();
  private readonly caret = new Graphics();
  private readonly glyph = new BitmapText({ text: '', style: { fontFamily: TILE_FONT, fontSize: FONT_SIZE }, anchor: 0.5 });
  private drawn = '';

  constructor(onPointer: (kind: TilePointer, spec: TileSpec) => void) {
    super();
    this.addChild(this.shadow, this.face, this.caret, this.glyph);
    const forward = (kind: TilePointer) => () => {
      if (this.spec?.action) onPointer(kind, this.spec);
    };
    this.on('pointertap', forward('tap'));
    this.on('pointerover', forward('over'));
    this.on('pointerout', forward('out'));
  }

  apply(spec: TileSpec, board: Board) {
    this.spec = spec;
    const { x, y } = cellToPoint(board, spec.row, spec.col);
    this.position.set(x, y);
    this.redraw(spec, board.cell);

    this.glyph.text = spec.variant === 'slot' ? '' : spec.char;
    this.glyph.tint = TONES[spec.tone ?? 'stone'].text;
    this.glyph.style.fontSize = board.cell * 0.55;
    this.glyph.y = -board.cell * 0.05;

    // The hit area covers the gap too, so a word reads as one button.
    const interactive = !!spec.action;
    this.eventMode = interactive ? 'static' : 'passive';
    this.cursor = interactive ? 'pointer' : 'default';
    this.hitArea = interactive ? new Rectangle(-board.pitch / 2, -board.pitch / 2, board.pitch, board.pitch) : null;
  }

  /** Back to a blank state before returning to the pool. */
  reset() {
    this.spec = null;
    this.eventMode = 'passive';
    this.hitArea = null;
    this.alpha = 1;
    this.scale.set(1);
    this.rotation = 0;
  }

  private redraw(spec: TileSpec, cell: number) {
    const key = `${spec.tone}|${spec.variant}|${spec.active}|${cell}`;
    if (key === this.drawn) return;
    this.drawn = key;
    const tone = TONES[spec.tone ?? 'stone'];
    const half = cell / 2;
    const radius = Math.max(1, cell * 0.08);

    this.shadow.clear().roundRect(-half, -half, cell, cell, radius).fill(tone.shadow);
    this.face.clear();
    if (spec.variant !== 'slot') this.face.roundRect(-half, -half, cell, cell * 0.9, radius).fill(tone.face);
    this.caret.clear();
    if (spec.variant === 'slot' && spec.active) {
      this.caret.roundRect(-half + cell * 0.15, half - cell * 0.28, cell * 0.7, cell * 0.08, radius).fill(BOARD.cursor);
    }
  }
}
