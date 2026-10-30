/**
 * Every sound number lives here (the "Madeira" palette approved in
 * docs/sound-plan.md). Times are in seconds, gains are linear (1 = full
 * scale), pitches are MIDI notes or, for `hit`, a multiplier. Notes are
 * scale degrees, turned into MIDI by `degree()` in cues.ts.
 */
export const soundTokens = {
  /** D major pentatonic: any two degrees sound fine together. */
  scale: { root: 62, steps: [0, 2, 4, 7, 9] },
  /** Master gain per volume setting. */
  volume: { low: 0.4, medium: 0.7, high: 1 },
  /** No single voice goes above this. */
  maxGain: 0.8,
  /** Exponential ramps end here, never at 0 (which throws). */
  floor: 0.001,
  /** Where an envelope starts before its attack. */
  start: 0.0001,
  attack: 0.002,
  noiseAttack: 0.001,
  /** Oscillators and noise stop this long after their envelope ends. */
  tail: 0.02,
  /** One second of white noise, read from a random offset up to `offset`. */
  noise: { seconds: 1, offset: 0.5 },

  /** A wooden tile knocked on the table: band-passed noise plus a falling sine. */
  hit: {
    freq: 540,
    freqTo: 430,
    decay: 0.05,
    noise: { freq: 1900, q: 3, dur: 0.018, share: 0.7 },
  },
  /** Marimba: the fundamental, a short 4th harmonic and a bit of octave in triangle. */
  note: {
    fourth: { ratio: 4, share: 0.22, decay: 0.05 },
    octave: { ratio: 2, share: 0.1, len: 0.5 },
  },
  /** Muted and low: a falling triangle under a low-pass, with a breath of noise. */
  thud: {
    drop: 0.82,
    filter: { freq: 650, q: 0.7 },
    noise: { freq: 500, q: 1, dur: 0.03, share: 0.35 },
  },

  /** Fixed cues as voices (`degree` for notes and thuds, `pitch` for hits). */
  cues: {
    press: [{ at: 0, instrument: 'hit', pitch: 1, gain: 0.16 }],
    toggleOn: [
      { at: 0, instrument: 'hit', pitch: 0.9, gain: 0.12 },
      { at: 0.06, instrument: 'hit', pitch: 1.25, gain: 0.15 },
    ],
    toggleOff: [
      { at: 0, instrument: 'hit', pitch: 1.25, gain: 0.12 },
      { at: 0.06, instrument: 'hit', pitch: 0.9, gain: 0.13 },
    ],
    copy: [
      { at: 0, instrument: 'hit', pitch: 1, gain: 0.12 },
      { at: 0.04, instrument: 'note', degree: 9, gain: 0.1, len: 0.2 },
    ],
    roomJoined: [
      { at: 0, instrument: 'note', degree: 5, gain: 0.13, len: 0.18 },
      { at: 0.08, instrument: 'note', degree: 7, gain: 0.14, len: 0.3 },
    ],
    roomLeft: [
      { at: 0, instrument: 'note', degree: 7, gain: 0.11, len: 0.18 },
      { at: 0.08, instrument: 'note', degree: 5, gain: 0.1, len: 0.3 },
    ],
    notice: [
      { at: 0, instrument: 'note', degree: 6, gain: 0.11, len: 0.15 },
      { at: 0.13, instrument: 'note', degree: 6, gain: 0.11, len: 0.25 },
    ],
    count: [
      { at: 0, instrument: 'hit', pitch: 1, gain: 0.12 },
      { at: 0, instrument: 'note', degree: 2, gain: 0.18, len: 0.2 },
    ],
    go: [
      { at: 0, instrument: 'hit', pitch: 1.2, gain: 0.16 },
      { at: 0, instrument: 'note', degree: 5, gain: 0.14, len: 0.6 },
      { at: 0, instrument: 'note', degree: 7, gain: 0.14, len: 0.6 },
      { at: 0, instrument: 'note', degree: 9, gain: 0.14, len: 0.6 },
    ],
    delete: [{ at: 0, instrument: 'hit', pitch: 0.85, gain: 0.08 }],
    refuse: [
      { at: 0, instrument: 'thud', degree: 2, gain: 0.24, len: 0.16 },
      { at: 0.1, instrument: 'thud', degree: 1, gain: 0.2, len: 0.16 },
    ],
    pass: [
      { at: 0, instrument: 'note', degree: 4, gain: 0.13, len: 0.15 },
      { at: 0.1, instrument: 'note', degree: 2, gain: 0.12, len: 0.3 },
    ],
    timeout: [
      { at: 0, instrument: 'thud', degree: 0, gain: 0.26, len: 0.22 },
      { at: 0.12, instrument: 'note', degree: -3, gain: 0.12, len: 0.45 },
    ],
    /** My turn: two rising notes, shifted up the scale by my colour's index. */
    turnMine: [
      { at: 0, instrument: 'note', degree: 5, gain: 0.2, len: 0.22 },
      { at: 0.09, instrument: 'note', degree: 7, gain: 0.22, len: 0.4 },
    ],
    /** Someone else's turn: one quiet note on their colour's degree. */
    turnOther: [{ at: 0, instrument: 'note', degree: 0, gain: 0.1, len: 0.25 }],
  },

  /** Each letter typed: a quiet, high hit that varies a little every time. */
  key: { pitch: 1.3, gain: 0.09, pitchVary: 0.06, gainVary: 0.15 },
  /** A word links into the chain: a climb of shared letters + 1 notes; its base walks up with the chain. */
  link: {
    baseDegree: 5,
    baseSpan: 5,
    maxLetters: 5,
    start: 0.04,
    step: 0.07,
    gain: 0.16,
    len: 0.18,
    lastGain: 0.22,
    lastLen: 0.5,
    hit: { pitch: 0.8, gain: 0.14 },
  },
  /** Clock beats: the turn's high, the match's low; urgent ones are louder and add a note. */
  tick: {
    pitch: { turn: 1.6, match: 0.75 },
    gain: 0.1,
    urgentPitch: 1.25,
    urgentGain: 0.17,
    urgentNote: { degree: { turn: 9, match: 0 }, gain: 0.07, len: 0.09 },
  },
  /** End of the match: a climb then a chord; the win climbs further and lands higher. */
  end: {
    plain: { climb: [0, 2, 4], step: 0.12, chord: [5, 7, 9] },
    win: { climb: [0, 2, 4, 5, 7], step: 0.09, chord: [7, 9, 10, 12] },
    climbShift: 2,
    climbGain: 0.15,
    climbLen: 0.2,
    chordGain: 0.13,
    chordLen: 0.9,
  },
} as const;

type Widen<T> = T extends number ? number : T extends string ? T : { [K in keyof T]: Widen<T[K]> };

export type SoundTokens = Widen<typeof soundTokens>;
