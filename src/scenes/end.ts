import type { GameState } from '@src/protocol/schema';
import { playerTone } from '@src/theme/palette';
import { centred, clip, isCompact, text } from './text';
import type { Area, Scene } from './types';

/** Names stop short of the score column. */
const NAME_CELLS = 8;

/** Final ranking, best score first; FIM and the way back home are HUD. */
export function endScene(game: GameState, area: Area): Scene {
  const ranked = [...game.players].sort((a, b) => b.score - a.score);
  const top = centred(ranked.length);
  const tiles = ranked.flatMap((player, i) => {
    const row = top + i;
    const score = String(player.score);
    return [
      ...text(`rank-${player.id}`, String(i + 1), row, -6, { tone: 'stone' }),
      ...text(`player-${player.id}`, player.name.slice(0, NAME_CELLS), row, -4, { tone: playerTone(player.color) }),
      ...text(`score-${player.id}`, score, row, 7 - score.length, { tone: i === 0 ? 'amber' : 'stone' }),
    ];
  });
  return {
    tiles: clip(tiles, area),
    fields: [],
    hud: {
      title: 'FIM',
      actions: [{ id: 'leave', label: 'NOVO JOGO', tone: 'amber', primary: true }],
      compact: isCompact(area),
    },
  };
}
