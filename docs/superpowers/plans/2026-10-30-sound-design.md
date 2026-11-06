# Sound Design (S1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the game the approved "Madeira" sound palette: every event in the spec's event map plays a short Web Audio sound synthesized at runtime, with a sound switch and volume in the settings drawer.

**Architecture:** Mirrors `src/motion/`. `src/sound/tokens.ts` holds every number; `cues.ts` turns a `Cue` into `Voice[]` (pure, tested in node); `synth.ts` is the only code that creates audio nodes; `mixer.ts` owns the single `AudioContext`, unlock, settings and persistence. A pure diff (`triggers.ts`) turns consecutive game frames into cues; the `App` plays them plus the cues of direct input (taps, typing, toggles, notices).

**Tech Stack:** Web Audio API (no dependency), React 19, TypeScript 6, Vitest 5 (node environment), Playwright.

**Spec:** `docs/sound-plan.md`. Sound source of truth: `docs/sound/index.html`, `PACKS.madeira` and the cue functions (`link`, `tick`, `turnMine`, `turnOther`, `key`, `refuse`, `timeout`, `count`, `go`, `end`, and the inline `play` of each `CUES` entry).

## Global Constraints

- Only the Madeira pack ships. Root MIDI 62, major pentatonic steps `[0, 2, 4, 7, 9]`.
- No sound number outside `src/sound/tokens.ts` (same rule as `motion/tokens.ts` and `theme/*`).
- No voice gain above `0.8`. Exponential ramps never target `0`: the floor is `0.001`.
- One `AudioContext` per page, created or resumed only inside a `pointerdown`/`keydown` handler.
- Sound starts **on** for everyone, including `prefers-reduced-motion`. Default volume `medium`; master gains `low 0.4`, `medium 0.7`, `high 1`.
- Settings are per device, saved in `localStorage` under `word-chain:sound`, editable by host and guest alike.
- While the tab is hidden, only "your turn" plays.
- UI copy in pt-BR; code, identifiers and commits in English, Conventional Commits.
- Check `git diff --cached --stat` before each commit (CRLF gotcha in `CLAUDE.md`).

## Review Focus

- **No Web Audio** (`AudioContext` missing or its constructor throws, e.g. strict privacy modes): the game runs silent and nothing throws. Test in Task 3.
- **Blocked or corrupt `localStorage`**: settings fall back to the defaults and writes fail silently. Test in Task 3.
- **Reconnect or a state that jumps several words or turns at once**: no burst of sounds, same as the particles. Test in Task 4.
- **Paste or autofill into a field, and overlaps longer than 5 letters**: one key sound per change (not one per letter), and the link climb is capped at 5 letters. Tests in Tasks 1 and 4.
- **iOS suspends the context after an interruption (call, lock screen), or the tab was hidden**: the next gesture resumes it, and ticks missed while hidden are not replayed. Test in Task 3.

---

### Task 0: Commit the groundwork

The skills, the spec, the audition page and this plan are on disk, uncommitted.

- [ ] **Step 1: Commit them**

```bash
git add .claude/skills/ui-sound-design .claude/skills/sounds-on-the-web docs/sound-plan.md docs/sound/index.html docs/superpowers/plans/2026-10-30-sound-design.md
git diff --cached --stat
git commit -m "docs(sound): add the S1 sound plan, audition page and sound skills"
```

### Task 1: Sound tokens and cue plans

**Files:**
- Create: `src/sound/tokens.ts`
- Create: `src/sound/cues.ts`
- Test: `src/sound/cues.test.ts`

**Interfaces:**
- Produces:
  - `soundTokens` (const) and `type SoundTokens` (widened like `MotionTokens` in `motion/tokens.ts`). Top-level keys: `scale: { root: 62, steps: [0, 2, 4, 7, 9] }`, `volume: { low: 0.4, medium: 0.7, high: 1 }`, `maxGain: 0.8`, `floor: 0.001`, `attack: 0.002`, `hit`, `note`, `thud` (the instrument numbers of `PACKS.madeira`), `cues` (one entry per cue, holding that cue's literals from the page, plus `link.maxLetters: 5`).
  - `type Cue = { type: 'press' } | { type: 'toggle'; on: boolean } | { type: 'copy' } | { type: 'room'; joined: boolean } | { type: 'notice' } | { type: 'count' } | { type: 'go' } | { type: 'key' } | { type: 'delete' } | { type: 'link'; letters: number; chain: number } | { type: 'refuse' } | { type: 'turn'; mine: boolean; color: number } | { type: 'tick'; clock: 'turn' | 'match'; urgent: boolean } | { type: 'pass' } | { type: 'timeout' } | { type: 'end'; win: boolean }`
  - `type Instrument = 'hit' | 'note' | 'thud'`
  - `interface Voice { at: number; instrument: Instrument; gain: number; pitch?: number; midi?: number; len?: number }`: `at` in seconds from the cue's start; `pitch` is the hit multiplier; `midi` is for note and thud.
  - `degree(n: number, tokens?: SoundTokens): number`: the page's `degree`.
  - `planCue(cue: Cue, random?: () => number, tokens?: SoundTokens): Voice[]`

Each cue's voices are exactly what the matching page function schedules (same order, offsets, gains and lengths), with every literal moved into `soundTokens`. `color` is the index in `PlayerColor` order. `delete` is the page's "APAGAR" hit, `count`/`go` are its `count`/`go`, and `room` is ENTROU/SAIU. `key` uses `random` where the page uses `Math.random` (in `vary`).

- [ ] **Step 1: Write the failing tests in `src/sound/cues.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { degree, planCue, type Cue } from './cues';
import { soundTokens } from './tokens';

const ALL: Cue[] = [
  { type: 'press' }, { type: 'toggle', on: true }, { type: 'toggle', on: false }, { type: 'copy' },
  { type: 'room', joined: true }, { type: 'room', joined: false }, { type: 'notice' }, { type: 'count' },
  { type: 'go' }, { type: 'key' }, { type: 'delete' }, { type: 'link', letters: 3, chain: 2 }, { type: 'refuse' },
  { type: 'turn', mine: true, color: 7 }, { type: 'turn', mine: false, color: 0 },
  { type: 'tick', clock: 'turn', urgent: true }, { type: 'tick', clock: 'match', urgent: false },
  { type: 'pass' }, { type: 'timeout' }, { type: 'end', win: true }, { type: 'end', win: false },
];
const notes = (cue: Cue) => planCue(cue, () => 0.5).filter((v) => v.instrument === 'note');

describe('degree', () => {
  it('walks the D major pentatonic across octaves', () => {
    expect([0, 1, 2, 3, 4, 5, 7].map((n) => degree(n))).toEqual([62, 64, 66, 69, 71, 74, 78]);
    expect(degree(-3)).toBe(54);
  });
});

describe('planCue', () => {
  it('keeps every voice audible, in time and under the gain ceiling', () => {
    for (const cue of ALL) {
      const voices = planCue(cue, () => 0.5);
      expect(voices.length, cue.type).toBeGreaterThan(0);
      for (const v of voices) {
        expect(v.at).toBeGreaterThanOrEqual(0);
        expect(v.gain).toBeGreaterThan(0);
        expect(v.gain).toBeLessThanOrEqual(soundTokens.maxGain);
      }
    }
  });

  it('climbs one note per shared letter plus one, from a base that walks with the chain', () => {
    expect(notes({ type: 'link', letters: 2, chain: 0 }).map((v) => v.midi)).toEqual([74, 76, 78]);
    expect(notes({ type: 'link', letters: 2, chain: 1 })[0].midi).toBe(76);
  });

  it('caps the climb at five letters', () => {
    expect(notes({ type: 'link', letters: 9, chain: 0 })).toHaveLength(6);
  });

  it('plays two rising notes on my turn and one quiet note on theirs, pitched by colour', () => {
    expect(notes({ type: 'turn', mine: true, color: 0 }).map((v) => v.midi)).toEqual([74, 78]);
    expect(notes({ type: 'turn', mine: false, color: 1 })).toEqual([expect.objectContaining({ midi: 64, gain: 0.1 })]);
  });

  it('varies each key a little', () => {
    const [low] = planCue({ type: 'key' }, () => 0);
    const [high] = planCue({ type: 'key' }, () => 1);
    expect(low.pitch).not.toBe(high.pitch);
    expect(low.pitch! / 1.3).toBeCloseTo(0.94, 2);
  });

  it('ticks the match lower than the turn and adds a note when urgent', () => {
    const turn = planCue({ type: 'tick', clock: 'turn', urgent: false });
    const match = planCue({ type: 'tick', clock: 'match', urgent: false });
    expect(match[0].pitch!).toBeLessThan(turn[0].pitch!);
    expect(planCue({ type: 'tick', clock: 'turn', urgent: true })).toHaveLength(2);
  });

  it('makes the win longer than the plain end', () => {
    const last = (voices: { at: number }[]) => Math.max(...voices.map((v) => v.at));
    expect(last(planCue({ type: 'end', win: true }))).toBeGreaterThan(last(planCue({ type: 'end', win: false })));
  });
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/sound/cues.test.ts`
Expected: FAIL, "Cannot find module './cues'"

- [ ] **Step 3: Write `src/sound/tokens.ts` and `src/sound/cues.ts`**

Document each token group with one line, like `motion/tokens.ts`. `planCue` is a `switch (cue.type)` over the page's cue functions. Clamp `link.letters` to `[1, cues.link.maxLetters]`.

- [ ] **Step 4: Run them and see them pass**

Run: `npx vitest run src/sound/cues.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/sound/tokens.ts src/sound/cues.ts src/sound/cues.test.ts
git commit -m "feat(sound): plan the Madeira cues from tokens"
```

### Task 2: Synth

**Files:**
- Create: `src/sound/synth.ts`
- Create: `src/sound/testing.ts` (fake audio context for tests, like `state/testing.ts`)
- Test: `src/sound/synth.test.ts`

**Interfaces:**
- Consumes: `Voice`, `soundTokens` (Task 1)
- Produces:
  - `playVoices(ctx: BaseAudioContext, dest: AudioNode, t0: number, voices: readonly Voice[], tokens?: SoundTokens): void`
  - `fakeAudioContext(): { ctx: AudioContext; log: FakeAudioLog }`, where `FakeAudioLog = { oscillators: number; noiseSources: number; buffers: number; starts: number[]; rampTargets: number[]; resumes: number }`. The fake implements the members `synth.ts` and `mixer.ts` use (`currentTime`, `state`, `sampleRate`, `destination`, `resume`, `createGain`, `createOscillator`, `createBiquadFilter`, `createBuffer`, `createBufferSource`), each `AudioParam` recording `exponentialRampToValueAtTime` targets.

`hit`, `note` and `thud` are the page's `PACKS.madeira` instruments, built from the page's `osc`/`noise`/`envelope` helpers with tokens instead of literals. The noise buffer is cached per context in a `WeakMap`.

- [ ] **Step 1: Write the failing tests**

- `builds a marimba note from three oscillators`: one `note` voice gives `log.oscillators === 3`.
- `builds a hit from a knock and a noise burst`: one `hit` voice gives `oscillators === 1` and `noiseSources === 1`.
- `never ramps to zero`: after playing `planCue` of every cue in Task 1's `ALL` list, `Math.min(...log.rampTargets) >= soundTokens.floor`.
- `schedules from t0`: with `t0 = 5`, every entry of `log.starts` is `>= 5`.
- `makes the noise buffer once per context`: two hits give `log.buffers === 1`.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/sound/synth.test.ts`
Expected: FAIL, "Cannot find module './synth'"

- [ ] **Step 3: Implement `fakeAudioContext` in `src/sound/testing.ts` and `playVoices` in `src/sound/synth.ts`**

- [ ] **Step 4: Run them and see them pass**

Run: `npx vitest run src/sound`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sound/synth.ts src/sound/testing.ts src/sound/synth.test.ts
git commit -m "feat(sound): synthesize hit, note and thud voices"
```

### Task 3: Mixer and the page's sound singleton

**Files:**
- Create: `src/sound/mixer.ts`
- Create: `src/sound/index.ts`
- Modify: `src/main.tsx` (call `installSoundUnlock()` before `createRoot`)
- Test: `src/sound/mixer.test.ts`

**Interfaces:**
- Consumes: `planCue`, `Cue` (Task 1); `playVoices`, `fakeAudioContext` (Task 2); `StorageLike` from `@src/state/gameMachine`
- Produces:
  - `type VolumeLevel = 'low' | 'medium' | 'high'`; `interface SoundSettings { enabled: boolean; volume: VolumeLevel }`; `DEFAULT_SOUND: SoundSettings = { enabled: true, volume: 'medium' }`; `SOUND_STORAGE_KEY = 'word-chain:sound'`
  - `interface MixerDeps { createContext: () => AudioContext; storage?: StorageLike | null; isHidden?: () => boolean; random?: () => number; render?: typeof playVoices; onPlay?: (cue: Cue) => void; tokens?: SoundTokens }`
  - `interface Mixer { unlock(): void; play(cue: Cue): void; settings(): SoundSettings; update(patch: Partial<SoundSettings>): void; subscribe(listener: () => void): () => void }`
  - `createMixer(deps: MixerDeps): Mixer`
  - In `index.ts`: `sound: Mixer` (browser deps: `new AudioContext()`, `localStorage` read inside `try`, `document.hidden`), `installSoundUnlock(target?: Window): void` (capture listeners for `pointerdown` and `keydown` that call `sound.unlock()` on every gesture), `useSoundSettings(): SoundSettings` (`useSyncExternalStore(sound.subscribe, sound.settings)`). In dev, `window.__soundLog: string[]` starts as `[]` and `onPlay` pushes `cue.type`.

Behaviour: `unlock` creates the context the first time (a master gain at `tokens.volume[level]` into `destination`) and calls `resume()` whenever the state is `suspended`. If `createContext` throws, the mixer stays silent for good. `play` does nothing before unlock, when disabled, or when hidden, except for `{ type: 'turn', mine: true }`. Otherwise it renders `planCue(cue, random)` at `currentTime` into the master and then calls `onPlay`. `update` merges, saves JSON, retargets the master gain and notifies subscribers. `settings()` returns the same object until `update` changes it (required by `useSyncExternalStore`). Stored JSON that fails to parse or has unknown values gives `DEFAULT_SOUND`, and storage that throws is ignored.

- [ ] **Step 1: Write the failing tests** (each builds a mixer on `fakeAudioContext()` with `render` as a `vi.fn()`)

- `stays silent before the first gesture`: `play({ type: 'press' })` before `unlock()` → `render` not called.
- `plays after unlock and reports the cue`: after `unlock()`, `play(press)` → `render` called once, `onPlay` called with the cue.
- `creates one context and resumes it when suspended`: `unlock()` twice → `createContext` called once; set the fake to `suspended`, `unlock()` → `log.resumes` increased by 1.
- `starts on, at medium volume`: with empty storage, `settings()` equals `{ enabled: true, volume: 'medium' }` and the master gain value is `0.7`.
- `goes quiet when disabled and remembers it`: `update({ enabled: false })` → `play` doesn't render; storage holds `{"enabled":false,"volume":"medium"}`; a new mixer on the same storage reads `enabled: false`.
- `falls back to defaults on corrupt or blocked storage`: `getItem` returns `'{oops'` → defaults; `getItem`/`setItem` throw → defaults, and `update` doesn't throw.
- `survives a browser without Web Audio`: `createContext` throws → `unlock()` and `play()` don't throw and `render` is never called.
- `only announces my turn while hidden`: `isHidden: () => true` → `tick` and the other player's `turn` don't render; `{ type: 'turn', mine: true, color: 0 }` does.
- `keeps the same settings object until it changes`: `settings() === settings()`; it differs after `update`.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/sound/mixer.test.ts`
Expected: FAIL, "Cannot find module './mixer'"

- [ ] **Step 3: Implement `createMixer`, then `src/sound/index.ts`, and call `installSoundUnlock()` in `src/main.tsx`**

- [ ] **Step 4: Run the unit tests and lint**

Run: `npm test && npm run lint`
Expected: all PASS, no lint errors

- [ ] **Step 5: Commit**

```bash
git add src/sound/mixer.ts src/sound/mixer.test.ts src/sound/index.ts src/main.tsx
git commit -m "feat(sound): add the mixer with unlock, settings and persistence"
```

### Task 4: Game triggers

**Files:**
- Create: `src/sound/triggers.ts`
- Test: `src/sound/triggers.test.ts`

**Interfaces:**
- Consumes: `Cue` (Task 1); `GameState`, `PlayerColor` (protocol schema); `GameTimes`, `TICK_SECONDS`, `URGENT_TICK_SECONDS` (`scenes/game`); `GameError` (`state/gameMachine`); `Screen` (`state/selectors`); `countOverlap` (`lib/overlap`); `toBoardText` (`lib/sanitize`)
- Produces:
  - `interface SoundFrame { screen: Screen; playerId: string | null; game: GameState | null; times: GameTimes; lastError: GameError | null }`
  - `soundCues(prev: SoundFrame | null, next: SoundFrame): Cue[]`
  - `typingCue(before: string, after: string): Cue | null`: longer gives `key`, shorter gives `delete`, equal gives `null`
  - `actionCue(action: string, ready: boolean): Cue`: `copy` gives `copy`, `ready` gives `{ type: 'toggle', on: !ready }`, anything else gives `press`

Rules for `soundCues` (`playing` = screen `game`, a game, and `startsIn === 0`). With `prev === null` it returns `[]`.

| Cue | When |
| :--- | :--- |
| `count` | screen `game` and `startsIn` changed to 1–3 |
| `go` | `startsIn` went from > 0 to 0 |
| `link` | both frames playing and the chain grew by exactly 1; `letters` = `countOverlap` of the last two words through `toBoardText`; `chain` = new length − 1 |
| `refuse` | `lastError` changed (identity) and `next.lastError.request === 'word'` |
| `turn` | next playing and `turnPlayerId` differs from prev's (null when prev wasn't playing); `mine` = it's `playerId`; `color` = index of that player's color in `PlayerColor.options` (null → 0) |
| `pass` / `timeout` | both playing, prev had a turn player, the turn player changed and the chain did not grow; `timeout` if `prev.times.turn === 0`, else `pass` |
| `tick` turn | next playing, my turn, `times.turn` changed to 1–`TICK_SECONDS`; `urgent` ≤ `URGENT_TICK_SECONDS` |
| `tick` match | next playing, `times.match` changed to 1–`TICK_SECONDS`; same urgency |
| `room` | both frames on `lobby` with the same game name and `players.length` changed by ±1 |
| `end` | screen went `game` → `end`; `win` = my score equals the top score |

Cues come out in table order.

- [ ] **Step 1: Write the failing tests** (build frames with a small `frame(overrides)` helper over a two-player `GameState`)

- `says nothing on the first frame`: `soundCues(null, playing)` is `[]`.
- `counts down and starts`: `startsIn` 3 → 2 gives `[count]`; 1 → 0 with the turn on me gives `[go, turn mine]`.
- `links a new word with its overlap`: chain `['casa'] → ['casa', 'sapo']` gives `[{ type: 'link', letters: 2, chain: 1 }, …turn]`.
- `stays quiet when the chain jumps (reconnect)`: chain +2, or prev not playing → no `link`, `pass` or `timeout`.
- `refuses only word errors, once`: a new `lastError` with `request: 'word'` gives `refuse`; the same object again gives nothing; `request: 'join'` gives nothing.
- `tells a pass from a timeout`: turn changes, chain unchanged, prev `times.turn` 6 gives `pass`; prev `times.turn` 0 gives `timeout`.
- `ticks my turn and the match, urgent at the end`: my turn 4 → 3 gives `{ tick, clock: 'turn', urgent: true }`; someone else's turn 4 → 3 gives nothing; match 11 → 10 gives `{ tick, clock: 'match', urgent: false }`.
- `hears players come and go in the lobby`: 2 → 3 players gives `room joined`; 3 → 2 gives `room left`; a different room name gives nothing.
- `ends with a win for the top score`: `game` → `end` gives `{ type: 'end', win: true }` when my score is the max (ties count as a win), `false` otherwise.
- `typingCue`: `('', 'CASAMENTO')` → `key` (paste is one sound); `('CASA', 'CAS')` → `delete`; `('A', 'A')` → `null`.
- `actionCue`: `('copy', false)` → `copy`; `('ready', false)` → `toggle on`; `('ready', true)` → `toggle off`; `('pass', false)` → `press`.

- [ ] **Step 2: Run them and see them fail**

Run: `npx vitest run src/sound/triggers.test.ts`
Expected: FAIL, "Cannot find module './triggers'"

- [ ] **Step 3: Implement `soundCues`, `typingCue` and `actionCue` in `src/sound/triggers.ts`**

- [ ] **Step 4: Run them and see them pass**

Run: `npx vitest run src/sound`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sound/triggers.ts src/sound/triggers.test.ts
git commit -m "feat(sound): derive game cues from consecutive frames"
```

### Task 5: Play the cues in the app

**Files:**
- Create: `src/app/useGameSounds.ts`
- Modify: `src/app/App.tsx`
- Test: `e2e/app.spec.ts`, `e2e/match.spec.ts`

**Interfaces:**
- Consumes: `sound` (Task 3); `soundCues`, `SoundFrame`, `typingCue`, `actionCue` (Task 4)
- Produces: `useGameSounds(frame: SoundFrame): void`. It keeps the previous frame in a ref, runs `soundCues` in an effect keyed on the five frame fields and plays each cue. (StrictMode's second mount run sees an identical frame and plays nothing.)

`App` changes:
- `useGameSounds({ screen, playerId, game: state, times, lastError: game.lastError })` next to `useBoardEffects`.
- `onAction`: first `sound.play(actionCue(action, me?.status === 'ready'))`, where `me` is the same player lookup the `ready` case already does.
- `onConfig` (passed to `Hud`): `sound.play('repetition' in config ? { type: 'toggle', on: config.repetition! } : { type: 'press' })` before dispatching.
- `HiddenInput.onChange`: `const cue = typingCue(field.value, value); if (cue) sound.play(cue);` before dispatching.
- The `ui.notice` effect plays `{ type: 'notice' }` when `ui.notice` becomes non-null.

- [ ] **Step 1: Write the failing e2e tests**

In `e2e/app.spec.ts` add `plays nothing before a gesture and a press after one`. Read `window.__soundLog`: `[]` after `boardReady`; after `clickWord(page, 'CRIAR')`, poll until it contains `'press'`; after `page.getByLabel('Apelido').fill('Ana')`, it contains `'key'`.

In `e2e/match.spec.ts`, right after `await findWord(bia.page, word.toUpperCase());`, poll both pages until `__soundLog` contains `'link'`. Bia's log also contains `'turn'`. After Bia's refused word, Bia's log contains `'refuse'`.

- [ ] **Step 2: Run the app spec and see it fail**

Run: `npm run e2e -- app`
Expected: FAIL (`__soundLog` undefined or missing `'press'`)

- [ ] **Step 3: Write `useGameSounds` and wire `App` as listed**

- [ ] **Step 4: Run the checks**

Run: `npm test && npm run lint && npm run e2e -- app`
Expected: PASS. With the local backend (`CLAUDE.md`, "Ambiente"): `E2E_WS_URL=ws://localhost:3001 npm run e2e -- match` → PASS.

- [ ] **Step 5: Listen in the browser**

With `npm run dev` and the local backend in `.env.local`, play a match in two tabs. Each event in the spec's table sounds like the Madeira page, and nothing doubles up.

- [ ] **Step 6: Commit**

```bash
git add src/app/useGameSounds.ts src/app/App.tsx e2e/app.spec.ts e2e/match.spec.ts
git commit -m "feat(sound): play game and input cues in the app"
```

### Task 6: Sound settings in the drawer

**Files:**
- Modify: `src/app/hud/SettingsDrawer.tsx`, `src/app/hud/Hud.tsx`, `src/app/App.tsx`
- Test: `e2e/match.spec.ts` (the drawer lives in the lobby, which needs a backend; persistence across reloads is covered by the mixer tests)

**Interfaces:**
- Consumes: `useSoundSettings`, `sound`, `SoundSettings`, `VolumeLevel` (Task 3)
- Produces: `SettingsDrawer` and `Hud` get the props `sound: SoundSettings` and `onSound: (patch: Partial<SoundSettings>) => void`. `App` passes `useSoundSettings()` and a handler that, when turning off, plays `toggle off` before `sound.update`, and otherwise calls `sound.update` first and then plays `toggle on` (enabling) or `press` (volume).

Drawer copy and markup (same `hud-option` / `hud-switch` / `hud-segmented` patterns as the existing rows, always editable):
- `Som`, "Efeitos sonoros neste aparelho": switch, `aria-label="Som"`, tone `emerald` when on.
- `Volume`, "Altura dos efeitos": segmented `BAIXO` / `MÉDIO` / `ALTO` (`low` / `medium` / `high`), `aria-label="Volume"`, disabled while the sound is off.
- The guest note changes to "Só quem criou a sala altera a partida." and sits right after the room options, before the sound rows.

- [ ] **Step 1: Write the failing e2e assertions**

In `e2e/match.spec.ts`, once Bia is in the lobby (after `await findWord(ana.page, 'BIA');`), Bia opens `Configurações`. The `Som` switch is enabled even though she is a guest. Clicking it gives `aria-checked="false"`, `localStorage['word-chain:sound']` holds `"enabled":false`, and the `Volume` buttons are disabled. Clicking again gives `aria-checked="true"`. Close the drawer with `Fechar`.

- [ ] **Step 2: Run it and see it fail**

Run (with the local backend up): `E2E_WS_URL=ws://localhost:3001 npm run e2e -- match`
Expected: FAIL (no `Som` switch)

- [ ] **Step 3: Add the rows, the props and the `App` handler**

- [ ] **Step 4: Run the checks**

Run: `npm test && npm run lint && npm run build && E2E_WS_URL=ws://localhost:3001 npm run e2e`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/hud/SettingsDrawer.tsx src/app/hud/Hud.tsx src/app/App.tsx e2e/match.spec.ts
git commit -m "feat(sound): add sound and volume to the settings drawer"
```

### Task 7: `/dev/sound` and docs

**Files:**
- Create: `src/dev/SoundBoard.tsx`
- Modify: `src/main.tsx` (add `'/dev/sound'` to `devPages`)
- Delete: `docs/sound/index.html`
- Modify: `docs/sound-plan.md`, `docs/refactor-plan.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: `sound`, `useSoundSettings` (Task 3); `Cue` (Task 1)
- Produces: a dev-only page with the audition page's groups and variant buttons. Every button calls `sound.play(cue)` with the real tokens. It also has the "TOCAR CENA" scene (the page's `SCENE` timings, scheduled with `setTimeout`) and the drawer's Som/Volume controls.

- [ ] **Step 1: Build `SoundBoard.tsx` and register the route**

- [ ] **Step 2: Check it in the browser**

Run `npm run dev`, open `/dev/sound`: every button plays, the scene runs about 17 s, and the console has no errors.

- [ ] **Step 3: Update the docs**

- `docs/sound-plan.md`: tick the remaining steps, and point "Audição" and section 4 at `/dev/sound`.
- `docs/refactor-plan.md`: add S1 to the phase list as done, linking `docs/sound-plan.md`.
- `CLAUDE.md`: under "Estado atual", add one bullet for `src/sound/` (tokens → cues → synth → mixer, `triggers.ts`, `useGameSounds`, `window.__soundLog`, `/dev/sound`). Add `src/sound/tokens.ts` to the no-magic-numbers convention.

- [ ] **Step 4: Run the full suite**

Run: `npm test && npm run lint && npm run build && npm run e2e`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/dev/SoundBoard.tsx src/main.tsx docs/sound docs/sound-plan.md docs/refactor-plan.md CLAUDE.md
git commit -m "docs(sound): move the audition to /dev/sound and record S1"
```
