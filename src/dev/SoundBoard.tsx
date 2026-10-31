import React from 'react';
import { PlayerColor } from '@src/protocol/schema';
import { sound, useSoundSettings, type Cue, type VolumeLevel } from '@src/sound';

type Variant = { label: string; cue: Cue };
type Row = { label: string; when: string; variants: Variant[] };

const colors = (mine: boolean): Variant[] =>
  PlayerColor.options.map((color, i) => ({ label: color, cue: { type: 'turn', mine, color: i } }));

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: 'Interface',
    rows: [
      { label: 'Toque', when: 'HUD e tiles tocáveis', variants: [{ label: 'ouvir', cue: { type: 'press' } }] },
      { label: 'Ligar / desligar', when: 'PRONTO, switches', variants: [
        { label: 'liga', cue: { type: 'toggle', on: true } },
        { label: 'desliga', cue: { type: 'toggle', on: false } },
      ] },
      { label: 'Copiado', when: 'código da sala', variants: [{ label: 'ouvir', cue: { type: 'copy' } }] },
      { label: 'Sala', when: 'alguém entra ou sai', variants: [
        { label: 'entrou', cue: { type: 'room', joined: true } },
        { label: 'saiu', cue: { type: 'room', joined: false } },
      ] },
      { label: 'Aviso', when: 'mensagem do servidor', variants: [{ label: 'ouvir', cue: { type: 'notice' } }] },
    ],
  },
  {
    title: 'Partida',
    rows: [
      { label: 'Contagem', when: '3 · 2 · 1 · JÁ', variants: [
        { label: 'número', cue: { type: 'count' } },
        { label: 'já', cue: { type: 'go' } },
      ] },
      { label: 'Digitar', when: 'campo da palavra', variants: [
        { label: 'letra', cue: { type: 'key' } },
        { label: 'apagar', cue: { type: 'delete' } },
      ] },
      { label: 'Palavra aceita', when: 'letras em comum', variants: [1, 2, 3, 4, 5].map((letters) => ({
        label: String(letters), cue: { type: 'link', letters, chain: 0 },
      })) },
      { label: 'Palavra recusada', when: 'com o shake', variants: [{ label: 'ouvir', cue: { type: 'refuse' } }] },
      { label: 'Sua vez', when: 'por cor', variants: colors(true) },
      { label: 'Vez do outro', when: 'por cor', variants: colors(false) },
      { label: 'Relógio', when: 'últimos 10 s', variants: [
        { label: 'vez', cue: { type: 'tick', clock: 'turn', urgent: false } },
        { label: 'vez urgente', cue: { type: 'tick', clock: 'turn', urgent: true } },
        { label: 'partida', cue: { type: 'tick', clock: 'match', urgent: false } },
        { label: 'partida urgente', cue: { type: 'tick', clock: 'match', urgent: true } },
      ] },
      { label: 'Passar / tempo esgotado', when: 'vez sem palavra', variants: [
        { label: 'passar', cue: { type: 'pass' } },
        { label: 'esgotado', cue: { type: 'timeout' } },
      ] },
      { label: 'Fim', when: 'classificação', variants: [
        { label: 'fim', cue: { type: 'end', win: false } },
        { label: 'vitória', cue: { type: 'end', win: true } },
      ] },
    ],
  },
];

const key: Cue = { type: 'key' };
const tick: Cue = { type: 'tick', clock: 'turn', urgent: true };

/** A match in ~17 s, as on the audition page: [ms, label, cue]. */
const SCENE: [number, string, Cue][] = [
  [0, 'Contagem 3', { type: 'count' }], [1000, '2', { type: 'count' }], [2000, '1', { type: 'count' }],
  [3000, 'JÁ!', { type: 'go' }],
  [3900, 'Sua vez', { type: 'turn', mine: true, color: 0 }],
  [4600, 'C', key], [4760, 'CA', key], [4890, 'CAS', key], [5070, 'CASA', key],
  [5600, 'ENVIAR', { type: 'press' }],
  [5900, 'Palavra aceita', { type: 'link', letters: 2, chain: 1 }],
  [7200, 'Vez do azul', { type: 'turn', mine: false, color: 1 }],
  [8600, 'Sua vez', { type: 'turn', mine: true, color: 0 }],
  [9100, 'X', key], [9250, 'XY', key], [9550, 'apaga', { type: 'delete' }], [9800, 'XZ', key],
  [10200, 'ENVIAR', { type: 'press' }],
  [10400, 'Palavra recusada', { type: 'refuse' }],
  [11400, '3 s', tick], [12400, '2 s', tick], [13400, '1 s', tick],
  [14400, 'Tempo esgotado', { type: 'timeout' }],
  [15400, 'Vez do verde', { type: 'turn', mine: false, color: 2 }],
  [16400, 'Fim: vitória', { type: 'end', win: true }],
];

const VOLUMES: VolumeLevel[] = ['low', 'medium', 'high'];
const button = 'rounded bg-stone-700 px-2 py-1 hover:bg-stone-600';

/** /dev/sound: every cue with the real tokens, the match scene and the drawer's settings. */
export default function SoundBoard() {
  const settings = useSoundSettings();
  const [step, setStep] = React.useState('');
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setStep('');
  };
  React.useEffect(() => stop, []);

  const playScene = () => {
    stop();
    timers.current = SCENE.map(([at, label, cue]) => setTimeout(() => {
      sound.play(cue);
      setStep(label);
    }, at));
  };

  return (
    // The game unlocks audio on any gesture; this page does it on its own.
    <main className="min-h-dvh bg-stone-950 p-4 text-sm text-stone-200" onPointerDownCapture={() => sound.unlock()}>
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-lg font-semibold">Sons (Madeira)</h1>
          <p className="text-stone-400 [overflow-wrap:anywhere]">Todos os cues com os números de <code>src/sound/tokens.ts</code>. Toque em qualquer botão para liberar o áudio.</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={settings.enabled} onChange={(e) => sound.update({ enabled: e.target.checked })} />
              Som
            </label>
            <label className="flex items-center gap-2">
              Volume
              <select
                className="rounded bg-stone-800 px-1"
                value={settings.volume}
                onChange={(e) => sound.update({ volume: e.target.value as VolumeLevel })}
              >
                {VOLUMES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <button type="button" className={button} onClick={playScene}>Tocar cena</button>
            <button type="button" className={button} onClick={stop}>Parar</button>
            <output data-testid="sound-step">{step}</output>
          </div>
        </header>

        {GROUPS.map(({ title, rows }) => (
          <section key={title} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400">{title}</h2>
            {rows.map((row) => (
              <div key={row.label} className="grid gap-2 border-t border-stone-800 pt-2 sm:grid-cols-[12rem_1fr]">
                <div>
                  <strong className="block">{row.label}</strong>
                  <span className="text-xs text-stone-500">{row.when}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.variants.map((v) => (
                    <button key={v.label} type="button" className={button} onClick={() => sound.play(v.cue)}>{v.label}</button>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
