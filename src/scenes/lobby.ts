import { toBoardText } from '@src/lib/sanitize';
import type { GameConfig, GameState } from '@src/protocol/schema';
import { playerTone } from '@src/theme/palette';
import { centred, clip, isCompact, text } from './text';
import type { Area, HudAction, Scene } from './types';

/** Long names are cut so the ready mark stays on the board. */
const NAME_CELLS = 10;

export interface LobbyState {
  game: GameState;
  playerId: string | null;
  /** The room name was just copied. */
  copied: boolean;
  readyPending: boolean;
  startPending: boolean;
  /** The settings drawer is open over the room. */
  settings: boolean;
  /** The host's local settings, sent with `start`. */
  config: GameConfig;
}

/**
 * The players with their ready mark, one cell after the longest name; the
 * room name, settings and buttons are HUD.
 */
export function lobbyScene(state: LobbyState, area: Area): Scene {
  const { game, playerId, readyPending, startPending } = state;
  const busy = readyPending || startPending;
  const me = game.players.find((p) => p.id === playerId);
  const amReady = me?.status === 'ready';
  const isHost = playerId !== null && game.hostId === playerId;

  const names = game.players.map((p) => toBoardText(p.name).slice(0, NAME_CELLS));
  const longest = Math.max(0, ...names.map((n) => n.length));
  const col = centred(longest + 2);
  const top = centred(game.players.length);
  const tiles = game.players.flatMap((player, i) => {
    const ready = player.status === 'ready';
    return [
      ...text(`player-${player.id}`, names[i], top + i, col, { tone: playerTone(player.color) }),
      ...text(`status-${player.id}`, ready ? '✓' : '✕', top + i, col + longest + 1, { tone: ready ? 'emerald' : 'rose' }),
    ];
  });

  const actions: HudAction[] = [amReady
    ? { id: 'ready', label: 'ESPERAR', tone: 'stone', disabled: busy }
    : { id: 'ready', label: 'PRONTO', tone: 'emerald', disabled: busy }];
  if (isHost) actions.push({ id: 'start', label: 'INICIAR', tone: 'amber', primary: true, disabled: busy });

  return {
    tiles: clip(tiles, area),
    fields: [],
    hud: {
      back: 'leave',
      title: `SALA: ${game.name.toUpperCase()}`,
      copy: { copied: state.copied },
      settings: true,
      actions,
      ...(state.settings && { drawer: { config: isHost ? state.config : game.config, editable: isHost } }),
      compact: isCompact(area),
    },
  };
}
