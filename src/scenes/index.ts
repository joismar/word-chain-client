import type { ClientMessageType, GameState } from '@src/protocol/schema';
import type { Screen } from '@src/state/selectors';
import { endScene } from './end';
import { gameScene, type GameTimes } from './game';
import { homeScene, type HomeMode } from './home';
import { loadingScene } from './loading';
import { lobbyScene } from './lobby';
import { settingsScene } from './settings';
import type { Area, FieldId, Scene } from './types';

export type { Area, Field, FieldId, Scene } from './types';

/** Everything the board shows, from the game state plus what only this screen knows. */
export interface SceneInput {
  screen: Screen;
  game: GameState | null;
  playerId: string | null;
  ui: {
    mode: HomeMode;
    player: string;
    room: string;
    settings: boolean;
    config: GameState['config'];
    copied: boolean;
    typed: string;
    focused: FieldId | null;
  };
  times: GameTimes;
  /** Request types waiting for a reply. */
  pending: ReadonlySet<ClientMessageType>;
}

export function sceneFor(input: SceneInput, area: Area): Scene {
  const { screen, game, playerId, ui, pending } = input;
  if (screen === 'home') {
    return homeScene({ ...ui, loading: pending.has('host') || pending.has('join') }, area);
  }
  if (!game || screen === 'loading') return loadingScene(area);
  if (screen === 'lobby') {
    if (ui.settings) return settingsScene({ config: ui.config, isHost: game.hostId === playerId }, area);
    return lobbyScene({
      game, playerId, copied: ui.copied, readyPending: pending.has('ready'), startPending: pending.has('start'),
    }, area);
  }
  if (screen === 'game') {
    return gameScene({
      game, playerId, times: input.times, typed: ui.typed, focused: ui.focused === 'word',
      pending: pending.has('word') || pending.has('pass'),
    }, area);
  }
  return endScene(game, area);
}
