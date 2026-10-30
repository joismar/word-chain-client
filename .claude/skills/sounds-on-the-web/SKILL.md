---
name: sounds-on-the-web
description: Rules for audio feedback and procedural sound in web UIs (Web Audio API). Use when deciding which interactions get sound, adding sound to UI, synthesizing sounds with oscillators and noise, or reviewing sound code. Covers accessibility (toggle, volume, reduced motion, visual equivalent), when not to use sound, AudioContext management, envelopes and parameter ranges. Outputs file:line findings in review mode.
license: MIT
metadata:
  author: raphael-salaja
  source: https://github.com/raphaelsalaja/userinterface-wiki (skills/, sections 5 and 6 only)
  version: "3.0.0"
---

# Sounds on the Web

Audio feedback and sound synthesis rules from the User Interface Wiki. Each rule lives in `rules/<id>.md` with an explanation and incorrect vs. correct code. Load the rules relevant to the task; in review mode, scan the code against every rule and report `file:line — [rule-id] description`.

## When to Apply

- Deciding whether an interaction deserves a sound at all
- Adding audio feedback or procedural sound to UI
- Writing or reviewing Web Audio API code (AudioContext, oscillators, noise, envelopes, filters)

## Audio Feedback

- `a11y-visual-equivalent` - Every sound must have a visual equivalent
- `a11y-toggle-setting` - Provide toggle to disable sounds
- `a11y-reduced-motion-check` - Respect prefers-reduced-motion for sound
- `a11y-volume-control` - Allow independent volume adjustment
- `appropriate-no-high-frequency` - No sound on typing or keyboard nav
- `appropriate-confirmations-only` - Sound for payments, uploads, submissions
- `appropriate-errors-warnings` - Sound for errors that can't be overlooked
- `appropriate-no-decorative` - No sound on hover or decorative moments
- `appropriate-no-punishing` - Inform, don't punish with harsh sounds
- `impl-preload-audio` - Preload audio files to avoid delay
- `impl-default-subtle` - Default volume subtle (0.3), not loud
- `impl-reset-current-time` - Reset currentTime before replay
- `weight-match-action` - Sound weight matches action importance
- `weight-duration-matches-action` - Sound duration matches action duration

## Sound Synthesis

- `context-reuse-single` - Reuse single AudioContext, don't create per sound
- `context-resume-suspended` - Resume suspended AudioContext before playing
- `context-cleanup-nodes` - Disconnect audio nodes after playback
- `envelope-exponential-decay` - Exponential ramps for natural decay
- `envelope-no-zero-target` - Exponential ramps target 0.001, not 0
- `envelope-set-initial-value` - Set initial value before ramping
- `design-noise-for-percussion` - Filtered noise for clicks/taps
- `design-oscillator-for-tonal` - Oscillators with pitch sweep for tonal sounds
- `design-filter-for-character` - Bandpass filter to shape percussive sounds
- `param-click-duration` - Click sounds: 5-15ms duration
- `param-filter-frequency-range` - Click filter: 3000-6000Hz
- `param-reasonable-gain` - Gain under 1.0 to prevent clipping
- `param-q-value-range` - Filter Q: 2-5 for focused but natural

## Note for games

The "appropriate" rules are written for product UI. In a game, typing and turn feedback are part of play, so a rule like `appropriate-no-high-frequency` becomes "keep high-frequency sounds tiny, varied and optional" rather than "never".
