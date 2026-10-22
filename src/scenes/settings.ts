import type { GameConfig } from '@src/protocol/schema';
import { clip, text } from './text';
import type { Area, Scene } from './types';

export interface SettingsState {
  config: GameConfig;
  /** Only the host changes the settings; everyone else just reads them. */
  isHost: boolean;
}

export function settingsScene({ config, isHost }: SettingsState, area: Area): Scene {
  const tiles = [
    ...text('back', '<', -7, -5, { tone: 'emerald', action: 'close-settings' }),
    ...text('settings-title', 'CONFIG', -5, -5, { tone: 'amber' }),
    ...text('time-label', 'TEMPO', -2, -5, { tone: 'stone' }),
    ...text('time', `${config.time}MIN`, -2, 2, { tone: isHost ? 'sky' : 'stone', ...(isHost && { action: 'time' }) }),
    ...text('repetition-label', 'REPETIR', 0, -5, { tone: 'stone' }),
    ...text('repetition', config.repetition ? 'SIM' : 'NAO', 0, 3, {
      tone: isHost ? 'purple' : 'stone', ...(isHost && { action: 'repetition' }),
    }),
    ...text('close', 'VOLTAR', 4, -5, { tone: 'emerald', action: 'close-settings' }),
  ];
  return { tiles: clip(tiles, area), fields: [] };
}
