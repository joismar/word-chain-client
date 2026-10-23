import type { ClientMessageType, GameState } from '@src/protocol/schema';
import type { Screen } from '@src/state/selectors';
import { endScene } from './end';
import { gameScene, type GameTimes } from './game';
import { homeScene, type HomeMode } from './home';
import { loadingScene } from './loading';
import { lobbyScene } from './lobby';
import type { Area, FieldId, Scene } from './types';

export type { Area, Field, FieldId, Hud, HudAction, HudPlayer, HudTime, Scene } from './types';

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
    /** The server refused the word being typed. */
    wordError: boolean;
    /** Latest notice from the server, while it shows. */
    notice: string | null;
  };
  times: GameTimes;
  /** Request types waiting for a reply. */
  pending: ReadonlySet<ClientMessageType>;
}

/** Notice text as the HUD shows it: upper case, no closing full stop. */
export const noticeText = (message: string) => message.trim().replace(/\.$/, '').toLocaleUpperCase('pt-BR');

function screenScene(input: SceneInput, area: Area): Scene {
  const { screen, game, playerId, ui, pending } = input;
  if (screen === 'home') {
    return homeScene({ ...ui, loading: pending.has('host') || pending.has('join') }, area);
  }
  if (!game || screen === 'loading') return loadingScene(area);
  if (screen === 'lobby') {
    return lobbyScene({
      game, playerId, copied: ui.copied, readyPending: pending.has('ready'), startPending: pending.has('start'),
      settings: ui.settings, config: ui.config,
    }, area);
  }
  if (screen === 'game') {
    return gameScene({
      game, playerId, times: input.times, typed: ui.typed, focused: ui.focused === 'word',
      pending: pending.has('word') || pending.has('pass'), wordError: ui.wordError,
    }, area);
  }
  return endScene(game, area);
}

export function sceneFor(input: SceneInput, area: Area): Scene {
  const scene = screenScene(input, area);
  const { notice } = input.ui;
  return notice ? { ...scene, hud: { ...scene.hud, toast: { text: noticeText(notice), tone: 'rose' } } } : scene;
}
