import { soundTokens, type SoundTokens } from './tokens';

/** Something worth hearing; `planCue` turns it into voices. */
export type Cue =
  | { type: 'press' }
  | { type: 'toggle'; on: boolean }
  | { type: 'copy' }
  | { type: 'room'; joined: boolean }
  | { type: 'notice' }
  | { type: 'count' }
  | { type: 'go' }
  | { type: 'key' }
  | { type: 'delete' }
  /** `letters` shared with the previous word. */
  | { type: 'link'; letters: number }
  | { type: 'refuse' }
  /** `color` is the player's index in PlayerColor order. */
  | { type: 'turn'; mine: boolean; color: number }
  | { type: 'tick'; clock: 'turn' | 'match'; urgent: boolean }
  | { type: 'pass' }
  | { type: 'timeout' }
  | { type: 'end'; win: boolean };

export type Instrument = 'hit' | 'note' | 'thud';

/** One sound to play: `at` seconds after the cue starts. `pitch` is a hit's multiplier, `midi` a note's or thud's. */
export interface Voice {
  at: number;
  instrument: Instrument;
  gain: number;
  pitch?: number;
  midi?: number;
  len?: number;
}

type Template = SoundTokens['cues'][keyof SoundTokens['cues']][number];

/** MIDI note of scale degree `n` (negative degrees go down octaves). */
export function degree(n: number, tokens: SoundTokens = soundTokens): number {
  const { root, steps } = tokens.scale;
  const octave = Math.floor(n / steps.length);
  return root + 12 * octave + steps[((n % steps.length) + steps.length) % steps.length];
}

/** Fixed voices, with notes shifted `shift` degrees up the scale. */
function fixed(templates: readonly Template[], tokens: SoundTokens, shift = 0): Voice[] {
  return templates.map(({ at, instrument, gain, ...rest }) => {
    const voice: Voice = { at, instrument, gain };
    if ('pitch' in rest) voice.pitch = rest.pitch;
    if ('degree' in rest) voice.midi = degree(rest.degree + shift, tokens);
    if ('len' in rest) voice.len = rest.len;
    return voice;
  });
}

/** 1 ± amount, from a random number in [0, 1). */
const vary = (random: number, amount: number) => 1 + (random * 2 - 1) * amount;

function link(letters: number, tokens: SoundTokens): Voice[] {
  const { link: t } = tokens;
  const count = Math.min(Math.max(letters, 1), t.maxLetters);
  const voices: Voice[] = [];
  for (let i = 0; i <= count; i++) {
    const last = i === count;
    voices.push({
      at: t.start + i * t.step,
      instrument: 'note',
      midi: degree(t.baseDegree + i, tokens),
      gain: last ? t.lastGain : t.gain,
      len: last ? t.lastLen : t.len,
    });
  }
  voices.push({ at: 0, instrument: 'hit', pitch: t.hit.pitch, gain: t.hit.gain });
  return voices;
}

function tick(clock: 'turn' | 'match', urgent: boolean, tokens: SoundTokens): Voice[] {
  const { tick: t } = tokens;
  const pitch = t.pitch[clock];
  const voices: Voice[] = [{
    at: 0,
    instrument: 'hit',
    pitch: urgent ? pitch * t.urgentPitch : pitch,
    gain: urgent ? t.urgentGain : t.gain,
  }];
  if (urgent) {
    const note = t.urgentNote;
    voices.push({ at: 0, instrument: 'note', midi: degree(note.degree[clock], tokens), gain: note.gain, len: note.len });
  }
  return voices;
}

function end(win: boolean, tokens: SoundTokens): Voice[] {
  const t = tokens.end;
  const { climb, step, chord } = win ? t.win : t.plain;
  const top = climb.length * step;
  return [
    ...climb.map((n, i): Voice => ({
      at: i * step, instrument: 'note', midi: degree(n + t.climbShift, tokens), gain: t.climbGain, len: t.climbLen,
    })),
    ...chord.map((n): Voice => ({ at: top, instrument: 'note', midi: degree(n, tokens), gain: t.chordGain, len: t.chordLen })),
  ];
}

/** The voices of a cue. `random` only varies typed keys, so tests can pin it. */
export function planCue(cue: Cue, random: () => number = Math.random, tokens: SoundTokens = soundTokens): Voice[] {
  const { cues } = tokens;
  switch (cue.type) {
    case 'press': return fixed(cues.press, tokens);
    case 'toggle': return fixed(cue.on ? cues.toggleOn : cues.toggleOff, tokens);
    case 'copy': return fixed(cues.copy, tokens);
    case 'room': return fixed(cue.joined ? cues.roomJoined : cues.roomLeft, tokens);
    case 'notice': return fixed(cues.notice, tokens);
    case 'count': return fixed(cues.count, tokens);
    case 'go': return fixed(cues.go, tokens);
    case 'delete': return fixed(cues.delete, tokens);
    case 'refuse': return fixed(cues.refuse, tokens);
    case 'pass': return fixed(cues.pass, tokens);
    case 'timeout': return fixed(cues.timeout, tokens);
    case 'turn': return fixed(cue.mine ? cues.turnMine : cues.turnOther, tokens, cue.color);
    case 'key': {
      const { key } = tokens;
      return [{
        at: 0,
        instrument: 'hit',
        pitch: key.pitch * vary(random(), key.pitchVary),
        gain: key.gain * vary(random(), key.gainVary),
      }];
    }
    case 'link': return link(cue.letters, tokens);
    case 'tick': return tick(cue.clock, cue.urgent, tokens);
    case 'end': return end(cue.win, tokens);
  }
}
