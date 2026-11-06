import React from 'react';
import { GameCanvas } from '@src/app/GameCanvas';
import { HiddenInput } from '@src/app/HiddenInput';
import { inputTiles, wordTiles } from '@src/engine/join';
import type { EngineEvent, TileSpec } from '@src/engine/types';

const NAME = { row: -1, col: -5, length: 10 };

/** /dev/engine: exercises the engine (join, hit-testing, input) without the game. */
export default function EngineDemo() {
  const [expanded, setExpanded] = React.useState(false);
  const [extra, setExtra] = React.useState(true);
  const [name, setName] = React.useState('');
  const [focused, setFocused] = React.useState(false);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [log, setLog] = React.useState<string[]>([]);
  const [generation, setGeneration] = React.useState(0);

  const onEvent = React.useCallback((event: EngineEvent) => {
    if (event.type === 'hover') {
      setHovered(event.action);
      return;
    }
    setLog((l) => [`tap ${event.action} ${event.key}`, ...l].slice(0, 5));
    if (event.action === 'toggle') setExpanded((e) => !e);
    if (event.action === 'extra') setExtra((e) => !e);
    if (event.action === 'clear') setName('');
    if (event.action === 'remount') setGeneration((g) => g + 1);
  }, []);

  const tiles = React.useMemo<TileSpec[]>(() => [
    ...wordTiles('title', 'WORD CHAIN', -6, -5, { tone: 'stone' }),
    // Same key, new letters: tiles update in place instead of re-entering.
    ...wordTiles('menu', expanded ? 'APELIDO' : 'CRIAR', -3, -5, {
      tone: hovered === 'toggle' ? 'sky' : 'amber', action: 'toggle',
    }),
    ...inputTiles('name', name, NAME.row, NAME.col, NAME.length, focused),
    ...wordTiles('flag', extra ? 'SALA' : 'X', 1, -5, { tone: 'purple', action: 'extra' }),
    ...wordTiles('clear', '<', 3, -5, { tone: 'rose', action: 'clear' }),
    ...wordTiles('remount', 'R', 3, 0, { tone: 'sky', action: 'remount' }),
    ...wordTiles('go', '↵', 3, 5, { tone: 'emerald', action: 'go' }),
  ], [expanded, extra, name, focused, hovered]);

  return (
    <>
      <GameCanvas
        key={generation}
        tiles={tiles}
        onEvent={onEvent}
        overlay={(board) => (
          <HiddenInput
            board={board}
            row={NAME.row}
            col={NAME.col}
            maxLength={NAME.length}
            value={name}
            label="Apelido"
            onChange={setName}
            onSubmit={() => setLog((l) => [`submit ${name}`, ...l].slice(0, 5))}
            onFocusChange={setFocused}
          />
        )}
      />
      <pre data-testid="engine-log" className="fixed bottom-2 left-2 text-xs text-stone-400 pointer-events-none">
        {[`hover ${hovered ?? '-'}`, ...log].join('\n')}
      </pre>
    </>
  );
}
