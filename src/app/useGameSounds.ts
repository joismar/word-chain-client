import React from 'react';
import { sound } from '@src/sound';
import { soundCues, type SoundFrame } from '@src/sound/triggers';

/**
 * Plays what changed in the game since the last render. StrictMode's second
 * mount run sees the same frame again, so it plays nothing.
 */
export function useGameSounds({ screen, playerId, game, times, lastError }: SoundFrame) {
  const previous = React.useRef<SoundFrame | null>(null);
  React.useEffect(() => {
    const frame = { screen, playerId, game, times, lastError };
    const cues = soundCues(previous.current, frame);
    previous.current = frame;
    cues.forEach((cue) => sound.play(cue));
  }, [screen, playerId, game, times, lastError]);
}
