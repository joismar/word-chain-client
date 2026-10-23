import { BitmapFont, BitmapFontManager, BitmapText, Container, Graphics, Rectangle } from 'pixi.js';
import { BOARD_SYMBOLS } from '@src/lib/sanitize';
import { restMotion, type FlashTone, type TileMotion } from '@src/motion/choreography';
import { BOARD, SLOT_ALPHA, SLOT_DISABLED_ALPHA, TONES } from '@src/theme/palette';
import { tile as tileTokens } from '@src/theme/tokens';
import { cellToPoint, spanSize, type Board } from './layout';
import type { TileView } from './TileLayer';
import type { TileSpec } from './types';

export const TILE_FONT = 'TileFont';
/** Digits baked large for spanning tiles (the countdown), so they stay sharp. */
export const TILE_FONT_LARGE = 'TileFontLarge';
const FONT_SIZE = 48;
const LARGE_FONT_SIZE = 160;
const LARGE_CHARS = '0123456789';
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

/** Installs the white glyph atlases every tile tints. Call once per renderer. */
export function installTileFont(resolution: number) {
  const install = (name: string, chars: (string | string[])[], fontSize: number) => BitmapFont.install({
    name,
    chars,
    resolution,
    padding: 6,
    dynamicFill: true,
    style: { fontFamily: FONT_FAMILY, fontSize, fontWeight: FONT_WEIGHT, fill: 0xffffff },
  });
  install(TILE_FONT, [...BitmapFontManager.ALPHANUMERIC, BOARD_SYMBOLS], FONT_SIZE);
  install(TILE_FONT_LARGE, [LARGE_CHARS], LARGE_FONT_SIZE);
}

export function uninstallTileFont() {
  BitmapFontManager.uninstall(TILE_FONT);
  BitmapFontManager.uninstall(TILE_FONT_LARGE);
}

export type TilePointer = 'tap' | 'over' | 'out' | 'down' | 'up';

/**
 * One letter cell: a face over a darker strip at the bottom of the cell, and
 * its glyph centred on the face (an empty slot is a flat face at low
 * opacity). The tile itself sits on its cell and owns the hit area; `body`
 * carries the drawing and takes the motion channels, so animation never
 * moves what you click. A spanning tile covers `span` x `span` cells.
 */
export class Tile extends Container implements TileView {
  spec: TileSpec | null = null;
  /** Animated by the director; applied on every render. */
  readonly motion: TileMotion = restMotion();
  private readonly body = new Container();
  private readonly shadow = new Graphics();
  private readonly face = new Graphics();
  private readonly caret = new Graphics();
  private readonly overlay = new Graphics();
  private readonly glyph = new BitmapText({ text: '', style: { fontFamily: TILE_FONT, fontSize: FONT_SIZE }, anchor: 0.5 });
  private drawn = '';
  private pitch = 0;

  constructor(onPointer: (kind: TilePointer, spec: TileSpec) => void) {
    super();
    this.body.addChild(this.shadow, this.face, this.caret, this.glyph, this.overlay);
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
    const size = spanSize(board, spec.span);
    this.redraw(spec, size);

    const slot = spec.variant === 'slot';
    const large = (spec.span ?? 1) > 1 && LARGE_CHARS.includes(spec.char);
    this.glyph.style.fontFamily = large ? TILE_FONT_LARGE : TILE_FONT;
    this.glyph.text = slot ? '' : spec.char;
    this.glyph.tint = TONES[spec.tone ?? 'stone'].text;
    this.glyph.style.fontSize = size * tileTokens.glyph;
    this.glyph.y = slot ? 0 : -(size * tileTokens.shadow) / 2;

    // The hit area covers the gap too, so a word reads as one button.
    const interactive = !!spec.action;
    const reach = (spec.span ?? 1) * board.pitch;
    this.eventMode = interactive ? 'static' : 'passive';
    this.cursor = interactive ? 'pointer' : 'default';
    this.hitArea = interactive ? new Rectangle(-reach / 2, -reach / 2, reach, reach) : null;
    this.applyMotion();
  }

  /** Stops answering the pointer while an exit plays. */
  leave() {
    this.eventMode = 'none';
    this.cursor = 'default';
  }

  /** Colour of the flash overlay. */
  setFlashTone(tone: FlashTone) {
    this.overlay.tint = tone === 'light' ? 0xffffff : TONES[tone].face;
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
    const key = `${spec.tone}|${spec.variant}|${spec.active}|${spec.disabled}|${cell}`;
    if (key === this.drawn) return;
    this.drawn = key;
    const tone = TONES[spec.tone ?? 'stone'];
    const half = cell / 2;
    const radius = Math.max(1, cell * tileTokens.radius);
    const slot = spec.variant === 'slot';

    this.shadow.clear();
    if (slot) {
      this.face.clear().roundRect(-half, -half, cell, cell, radius)
        .fill({ color: tone.face, alpha: spec.disabled ? SLOT_DISABLED_ALPHA : SLOT_ALPHA });
    } else {
      // The strip sits inside the cell: the face covers all but its bottom.
      this.shadow.roundRect(-half, -half, cell, cell, radius).fill(tone.shadow);
      this.face.clear().roundRect(-half, -half, cell, cell * (1 - tileTokens.shadow), radius).fill(tone.face);
    }
    this.overlay.clear().roundRect(-half, -half, cell, cell, radius).fill(0xffffff);
    this.caret.clear();
    if (slot && spec.active && !spec.disabled) {
      const { inset, bottom, height } = tileTokens.caret;
      this.caret.roundRect(-half + cell * inset, half - cell * bottom, cell * (1 - 2 * inset), cell * height, radius)
        .fill(BOARD.cursor);
    }
  }
}
