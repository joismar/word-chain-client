import type { GameState } from '@src/protocol/schema';
import { playerTone } from '@src/theme/palette';
import { clip, text } from './text';
import type { Area, Scene } from './types';

/** Names stop short of the score column. */
const NAME_CELLS = 8;

/** Final ranking, best score first, and a way back home. */
export function endScene(game: GameState, area: Area): Scene {
  const ranked = [...game.players].sort((a, b) => b.score - a.score);
  const tiles = [
    ...text('end-title', 'FIM', -6, -1, { tone: 'rose' }),
    ...ranked.flatMap((player, i) => {
      const row = -3 + i;
      return [
        ...text(`rank-${player.id}`, String(i + 1), row, -5, { tone: 'stone' }),
        ...text(`player-${player.id}`, player.name.slice(0, NAME_CELLS), row, -4, { tone: playerTone(player.color) }),
        ...text(`score-${player.id}`, String(player.score), row, 5, { tone: i === 0 ? 'amber' : 'stone' }),
      ];
    }),
    ...text('new', 'NOVO', 6, -2, { tone: 'stone', action: 'leave' }),
    ...text('game', 'JOGO', 7, -1, { tone: 'stone', action: 'leave' }),
  ];
  return { tiles: clip(tiles, area), fields: [] };
}
