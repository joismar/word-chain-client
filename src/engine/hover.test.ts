import { describe, expect, it } from 'vitest';
import { HoverTracker } from './hover';
import type { EngineEvent, TileSpec } from './types';

const spec = (key: string, action: string): TileSpec => ({ key, char: 'A', row: 0, col: 0, action });

function setup() {
  const events: EngineEvent[] = [];
  const queue: (() => void)[] = [];
  const flush = () => queue.splice(0).forEach((f) => f());
  const hover = new HoverTracker((e) => events.push(e), (f) => queue.push(f));
  return { events, flush, hover };
}

describe('HoverTracker', () => {
  it('reports the hovered tile and clears it when the pointer leaves', () => {
    const { events, flush, hover } = setup();
    hover.over(spec('a', 'host'));
    hover.out(spec('a', 'host'));
    flush();
    expect(events).toEqual([
      { type: 'hover', action: 'host', key: 'a' },
      { type: 'hover', action: null, key: null },
    ]);
  });

  it('moves between letters without a blank hover in between', () => {
    const { events, flush, hover } = setup();
    hover.over(spec('a', 'host'));
    hover.out(spec('a', 'host'));
    hover.over(spec('b', 'host'));
    flush();
    expect(events.map((e) => e.type === 'hover' && e.key)).toEqual(['a', 'b']);
  });

  it('clears the hover when the hovered tile is no longer clickable', () => {
    const { events, hover } = setup();
    hover.over(spec('a', 'host'));
    hover.prune([spec('a', 'host')]);
    expect(events).toHaveLength(1);
    hover.prune([{ ...spec('a', 'host'), action: undefined }]);
    expect(events.at(-1)).toEqual({ type: 'hover', action: null, key: null });
  });
});
