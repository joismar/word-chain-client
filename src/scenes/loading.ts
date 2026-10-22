import { centred, clip, text } from './text';
import type { Area, Scene } from './types';

/** Before the first connection settles. */
export function loadingScene(area: Area): Scene {
  const label = 'CONECTANDO';
  return { tiles: clip(text('loading', label, 0, centred(label.length), { tone: 'stone' }), area), fields: [] };
}
