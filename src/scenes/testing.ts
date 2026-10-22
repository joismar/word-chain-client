/** Readable renderings of scenes for snapshot tests. Imported only by *.test.ts files. */
import type { TileSpec } from '@src/engine/types';
import type { Area, Scene } from './types';

/**
 * The board as text, one line per row: letters as they are, `_` for an empty
 * slot, `|` for the slot with the caret, `.` for an empty cell.
 */
export function ascii(scene: Scene, area: Area): string {
  const rowSpan = (area.rows - 1) / 2;
  const colSpan = (area.cols - 1) / 2;
  const at = new Map(scene.tiles.map((t) => [`${t.row},${t.col}`, t]));
  const lines: string[] = [];
  for (let row = -rowSpan; row <= rowSpan; row++) {
    let line = '';
    for (let col = -colSpan; col <= colSpan; col++) {
      const tile = at.get(`${row},${col}`);
      line += !tile ? '.' : tile.variant === 'slot' ? (tile.active ? '|' : '_') : tile.char;
    }
    lines.push(line);
  }
  return `\n${lines.join('\n')}\n`;
}

/** One line per word (tiles sharing a key prefix): id, text, position, tones, action. */
export function words(tiles: readonly TileSpec[]): string {
  const groups = new Map<string, TileSpec[]>();
  for (const tile of tiles) {
    const id = tile.key.slice(0, tile.key.lastIndexOf(':'));
    groups.set(id, [...(groups.get(id) ?? []), tile]);
  }
  const lines = [...groups].map(([id, group]) => {
    const text = group.map((t) => (t.variant === 'slot' ? '_' : t.char)).join('');
    const tones = [...new Set(group.map((t) => t.tone ?? 'stone'))].join('/');
    const action = group[0].action ? ` -> ${group[0].action}` : '';
    return `${id} "${text}" @${group[0].row},${group[0].col} ${tones}${action}`;
  });
  return `\n${lines.join('\n')}\n`;
}
