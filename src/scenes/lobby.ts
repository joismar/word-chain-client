import { toBoardText } from '@src/lib/sanitize';
import type { GameState } from '@src/protocol/schema';
import { playerTone } from '@src/theme/palette';
import { clip, text } from './text';
import type { Area, Scene } from './types';

/** Long names are cut so the ready mark stays on the board. */
const NAME_CELLS = 10;

export interface LobbyState {
  game: GameState;
  playerId: string | null;
  /** The room code was just copied. */
  copied: boolean;
  readyPending: boolean;
  startPending: boolean;
}

/** Room code, players with their ready mark, and the ready/start buttons. */
export function lobbyScene(state: LobbyState, area: Area): Scene {
  const { game, playerId, readyPending, startPending } = state;
  const busy = readyPending || startPending;
  const me = game.players.find((p) => p.id === playerId);
  const amReady = me?.status === 'ready';
  const isHost = playerId !== null && game.hostId === playerId;

  const tiles = [
    ...text('back', '<', -7, -5, { tone: 'emerald', action: 'leave' }),
    ...text('settings', '⚙', -7, 5, { tone: 'stone', action: 'settings' }),
    ...text('room-label', 'SALA', -5, -5, { tone: 'stone' }),
    ...text('room', state.copied ? 'COPIADO' : game.name, -4, -5, {
      tone: state.copied ? 'emerald' : 'amber', action: 'copy',
    }),
    ...game.players.flatMap((player, i) => {
      const row = -2 + i;
      const name = toBoardText(player.name).slice(0, NAME_CELLS);
      const ready = player.status === 'ready';
      return [
        ...text(`player-${player.id}`, name, row, -5, { tone: playerTone(player.color) }),
        ...text(`status-${player.id}`, ready ? '✓' : '✕', row, -4 + name.length, { tone: ready ? 'emerald' : 'rose' }),
      ];
    }),
    ...text('ready', readyPending ? '...' : amReady ? 'ESPERAR' : 'PRONTO', 4, -5, {
      tone: 'emerald', ...(!busy && { action: 'ready' }),
    }),
    ...(isHost ? text('start', startPending ? '...' : 'INICIAR', 5, -5, {
      tone: 'amber', ...(!busy && { action: 'start' }),
    }) : []),
  ];
  return { tiles: clip(tiles, area), fields: [] };
}
