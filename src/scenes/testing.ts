/** Readable renderings of scenes for snapshot tests. Imported only by *.test.ts files. */
import type { TileSpec } from '@src/engine/types';
import type { Area, Hud, HudTime, Scene } from './types';

/**
 * The board as text, one line per row: letters as they are, `_` for an empty
 * slot, `|` for the slot with the caret, `.` for an empty cell. A spanning
 * tile shows its letter in the centre and `#` over the rest of its square.
 */
export function ascii(scene: Scene, area: Area): string {
  const rowSpan = (area.rows - 1) / 2;
  const colSpan = (area.cols - 1) / 2;
  const at = new Map<string, TileSpec>();
  for (const t of scene.tiles) {
    const reach = ((t.span ?? 1) - 1) / 2;
    for (let r = t.row - reach; r <= t.row + reach; r++) {
      for (let c = t.col - reach; c <= t.col + reach; c++) {
        at.set(`${r},${c}`, r === t.row && c === t.col ? t : { ...t, char: '#' });
      }
    }
  }
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

const time = (t: HudTime) => `${t.seconds}s ${Math.round(t.fraction * 100)}%${t.urgent ? ' urgent' : ''}`;

/** The HUD, one line per piece that is there. */
export function hud(h: Hud): string {
  const lines: string[] = [];
  const bar = [
    h.back && `< -> ${h.back}`,
    h.title && `"${h.title}"`,
    h.copy && (h.copy.copied ? 'copy ✓' : 'copy'),
    h.settings && '⚙',
    h.logo && 'logo',
  ].filter(Boolean);
  if (bar.length) lines.push(`bar: ${bar.join(' · ')}`);
  if (h.clock) lines.push(`clock: ${time(h.clock)}`);
  for (const p of h.players ?? []) {
    lines.push(`player: ${p.name} ${p.tone} ${p.score}${p.active ? ' *' : ''}${p.turn ? ` ${time(p.turn)}` : ''}`);
  }
  if (h.toast) lines.push(`toast: "${h.toast.text}" ${h.toast.tone}`);
  for (const a of h.actions) {
    const flags = [a.primary && 'primary', a.disabled && 'disabled'].filter(Boolean).join(' ');
    lines.push(`action: ${a.id} "${a.label}${a.glyph ? ` ${a.glyph}` : ''}" ${a.tone}${flags ? ` ${flags}` : ''}`);
  }
  if (h.drawer) {
    const { config, editable } = h.drawer;
    lines.push(`drawer: ${config.time} min, repeat ${config.repetition ? 'on' : 'off'}${editable ? '' : ', read only'}`);
  }
  if (h.compact) lines.push('compact');
  return `\n${lines.join('\n')}\n`;
}
