import React from 'react';
import { GameCanvas } from '@src/app/GameCanvas';
import type { Stage } from '@src/engine/Stage';
import { inputTiles, wordTiles } from '@src/engine/join';
import type { EngineEvent, TileSpec, TileTone } from '@src/engine/types';
import { cloneTokens, type MotionTokens } from '@src/motion/tokens';

const WORDS = ['CASA', 'SAPO', 'POTE', 'TELA', 'LAGO', 'GOTA', 'TAMPA'];
const INPUT = { row: 2, col: -5, length: 7 };
const CHAIN_ROWS = 4;

type Screen = 'menu' | 'game';

// Slider ranges per token group (spring params are keyed by their own name).
const RANGES: Record<string, [number, number, number]> = {
  bounce: [-0.5, 0.8, 0.01],
  duration: [0, 1500, 10],
  stagger: [0, 80, 1],
  distance: [0, 1.5, 0.01],
  scale: [0.2, 1.6, 0.01],
  damping: [0, 1, 0.01],
  opacity: [0, 1, 0.01],
};

const NO_STATS = { active: 0, started: 0 };

function useMotionStats(stage: Stage | null) {
  const [stats, setStats] = React.useState(NO_STATS);
  React.useEffect(() => {
    if (!stage) return;
    const id = setInterval(() => setStats(stage.motionStats), 100);
    return () => clearInterval(id);
  }, [stage]);
  return stage ? stats : NO_STATS;
}

/** /dev/motion: plays every choreography and tunes the tokens live. */
export default function MotionPlayground() {
  const [stage, setStage] = React.useState<Stage | null>(null);
  const [tokens, setTokens] = React.useState(cloneTokens);
  const [reduced, setReduced] = React.useState<boolean | undefined>(undefined);
  const [screen, setScreen] = React.useState<Screen>('menu');
  const [chain, setChain] = React.useState<{ id: string; word: string }[]>([]);
  const [round, setRound] = React.useState(0);
  const [typed, setTyped] = React.useState('');
  const [tone, setTone] = React.useState<TileTone>('amber');
  const [seconds, setSeconds] = React.useState(10);
  const [log, setLog] = React.useState<string[]>([]);
  const stats = useMotionStats(stage);

  const inputId = `w${round}`;
  const target = WORDS[round % WORDS.length];
  const note = (line: string) => setLog((l) => [line, ...l].slice(0, 4));

  React.useEffect(() => {
    stage?.setMotion({ tokens, reduced });
  }, [stage, tokens, reduced]);

  // Timer: one beat a second, urgent for the last three.
  const [timerOn, setTimerOn] = React.useState(false);
  React.useEffect(() => {
    if (!timerOn) return;
    const id = setInterval(() => setSeconds((s) => (s <= 0 ? 10 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [timerOn]);
  React.useEffect(() => {
    if (timerOn) stage?.play({ type: 'tick', word: 'timer', urgent: seconds <= 3 });
  }, [timerOn, seconds, stage]);

  // An empty field submits the whole target, so the button works on its own.
  const accept = () => {
    setChain((c) => [...c, { id: inputId, word: typed || target }].slice(-CHAIN_ROWS));
    setTyped('');
    setRound((r) => r + 1);
  };

  const onEvent = React.useCallback((event: EngineEvent) => {
    if (event.type !== 'tap') return;
    note(`tap ${event.action}`);
    if (event.action === 'create' || event.action === 'join') setScreen('game');
    if (event.action === 'leave') setScreen('menu');
  }, []);

  const tiles = React.useMemo<TileSpec[]>(() => {
    if (screen === 'menu') {
      return [
        ...wordTiles('title', 'WORD CHAIN', -4, -5, { tone: 'stone' }),
        ...wordTiles('create', 'CRIAR SALA', -1, -5, { tone: 'amber', action: 'create' }),
        ...wordTiles('join', 'ENTRAR', 1, -3, { tone: 'emerald', action: 'join' }),
        ...wordTiles('help', 'COMO JOGAR', 3, -5, { tone: 'sky', action: 'help' }),
      ];
    }
    const top = -CHAIN_ROWS;
    return [
      ...wordTiles('leave', '←', -6, -5, { tone: 'rose', action: 'leave' }),
      ...wordTiles('timer', String(seconds).padStart(2, '0'), -6, 4, { tone: seconds <= 3 ? 'rose' : 'stone' }),
      // Newest word on the row right above the input; older ones climb.
      ...chain.flatMap(({ id, word }, i) =>
        wordTiles(id, word, top + (CHAIN_ROWS - chain.length) + i, -5, { tone: 'stone' })),
      ...inputTiles(inputId, typed, INPUT.row, INPUT.col, INPUT.length, true, { tone }),
    ];
  }, [screen, chain, inputId, typed, tone, seconds]);

  const game = screen === 'game';
  const actions: [string, () => void, boolean?][] = [
    ['Trocar tela', () => setScreen((s) => (s === 'menu' ? 'game' : 'menu'))],
    ['Digitar', () => setTyped((t) => (t.length < target.length ? target.slice(0, t.length + 1) : t)), !game],
    ['Apagar', () => setTyped((t) => t.slice(0, -1)), !game],
    ['Palavra aceita', accept, !game],
    ['Palavra inválida', () => stage?.play({ type: 'shake', word: inputId }), !game],
    ['Troca de turno', () => {
      const next = tone === 'amber' ? 'stone' : 'amber';
      setTone(next);
      stage?.play({ type: 'pulse', tone: next });
    }, !game],
    [timerOn ? 'Parar timer' : 'Timer', () => setTimerOn((on) => !on), !game],
  ];

  return (
    <>
      <GameCanvas tiles={tiles} onEvent={onEvent} onStage={setStage} />
      <aside className="fixed top-2 right-2 w-72 max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded bg-stone-900/90 p-3 text-xs text-stone-300 space-y-3">
        <div className="grid grid-cols-2 gap-1">
          {actions.map(([label, run, disabled]) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={run}
              className="rounded bg-stone-700 px-2 py-1 text-left hover:bg-stone-600 disabled:opacity-40"
            >
              {label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2">
          <span>Reduced motion</span>
          <select
            aria-label="Reduced motion"
            value={reduced === undefined ? 'system' : String(reduced)}
            onChange={(e) => setReduced(e.target.value === 'system' ? undefined : e.target.value === 'true')}
            className="bg-stone-800 rounded px-1"
          >
            <option value="system">sistema</option>
            <option value="true">ligado</option>
            <option value="false">desligado</option>
          </select>
        </label>
        <p>
          <span data-testid="motion-status">animações: {stats.active}</span>
          {' · '}
          <span data-testid="motion-started">iniciadas: {stats.started}</span>
        </p>
        <TokenEditor tokens={tokens} onChange={setTokens} />
        <pre data-testid="motion-log" className="text-stone-400">{log.join('\n')}</pre>
      </aside>
    </>
  );
}

function TokenEditor({ tokens, onChange }: { tokens: MotionTokens; onChange: (t: MotionTokens) => void }) {
  const [copied, setCopied] = React.useState(false);
  const set = (path: string[], value: number) => {
    const next = cloneTokens(tokens);
    let node = next as unknown as Record<string, unknown>;
    for (const part of path.slice(0, -1)) node = node[part] as Record<string, unknown>;
    node[path.at(-1)!] = value;
    onChange(next);
  };
  const source = `export const tokens = ${JSON.stringify(tokens, null, 2)} as const;`;

  const fields: { path: string[]; value: number }[] = [];
  const walk = (node: object, path: string[]) => {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'number') fields.push({ path: [...path, k], value: v });
      else walk(v, [...path, k]);
    }
  };
  walk(tokens, []);

  return (
    <details>
      <summary className="cursor-pointer">Tokens</summary>
      <div className="mt-2 space-y-1">
        {fields.map(({ path, value }) => {
          const [min, max, step] = RANGES[path[0] === 'spring' ? path[2] : path[0]];
          const name = path.join('.');
          return (
            <label key={name} className="grid grid-cols-[1fr_auto] gap-x-2">
              <span>{name}</span>
              <span className="tabular-nums">{value}</span>
              <input
                aria-label={name}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => set(path, Number(e.target.value))}
                className="col-span-2"
              />
            </label>
          );
        })}
        <div className="flex gap-1 pt-1">
          <button type="button" className="rounded bg-stone-700 px-2 py-1" onClick={() => onChange(cloneTokens())}>
            Restaurar
          </button>
          <button
            type="button"
            className="rounded bg-stone-700 px-2 py-1"
            onClick={() => navigator.clipboard?.writeText(source).then(() => setCopied(true), () => {})}
          >
            {copied ? 'Copiado' : 'Copiar tokens.ts'}
          </button>
        </div>
      </div>
    </details>
  );
}
