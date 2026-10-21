import type { TileSpec } from './types';

export interface TileJoin {
  enter: TileSpec[];
  update: TileSpec[];
  exit: string[];
}

const same = (a: TileSpec, b: TileSpec) =>
  a.char === b.char && a.row === b.row && a.col === b.col && a.tone === b.tone
  && a.variant === b.variant && a.active === b.active && a.action === b.action;

/** Data join by key: what to create, what changed, and which keys left. */
export function joinTiles(prev: ReadonlyMap<string, TileSpec>, next: readonly TileSpec[]): TileJoin {
  const seen = new Set<string>();
  const enter: TileSpec[] = [];
  const update: TileSpec[] = [];
  for (const spec of next) {
    if (seen.has(spec.key)) throw new Error(`duplicate tile key "${spec.key}"`);
    seen.add(spec.key);
    const old = prev.get(spec.key);
    if (!old) enter.push(spec);
    else if (!same(old, spec)) update.push(spec);
  }
  const exit = [...prev.keys()].filter((key) => !seen.has(key));
  return { enter, update, exit };
}

/** A word as one tile per letter, keyed `${id}:${index}`. Spaces leave a gap. */
export function wordTiles(
  id: string,
  text: string,
  row: number,
  col: number,
  extra: Omit<TileSpec, 'key' | 'char' | 'row' | 'col'> = {},
): TileSpec[] {
  return Array.from(text).flatMap((char, i) =>
    char === ' ' ? [] : [{ key: `${id}:${i}`, char, row, col: col + i, ...extra }]);
}

/** A text field: typed letters as solid tiles, the rest as slots with a caret. */
export function inputTiles(
  id: string,
  value: string,
  row: number,
  col: number,
  length: number,
  focused: boolean,
  extra: Omit<TileSpec, 'key' | 'char' | 'row' | 'col' | 'variant' | 'active'> = {},
): TileSpec[] {
  const chars = Array.from(value).slice(0, length);
  return Array.from({ length }, (_, i): TileSpec => {
    const typed = i < chars.length;
    const spec: TileSpec = {
      key: `${id}:${i}`, char: typed ? chars[i] : ' ', row, col: col + i,
      variant: typed ? 'solid' : 'slot', ...extra,
    };
    if (focused && i === chars.length) spec.active = true;
    return spec;
  });
}
