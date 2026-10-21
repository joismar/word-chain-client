import { GridItems, GridLayout } from '@src/components/GridLayout';
import { useGame } from '@src/state/useGame';
import { getGridPlayerColor } from '@src/utils/helpers';

export function EndGrid() {
  const { game, leave } = useGame();

  const sortedPlayers = [...(game?.players ?? [])].sort((a, b) => b.score - a.score);

  const gridItems: GridItems = {
    '-6,-1': {
      value: 'FIM',
      color: 'rose',
    },
  };

  sortedPlayers.forEach((player, index) => {
    const row = -3 + index;
    const playerColor = getGridPlayerColor(player.color);

    // Rank prefix + Player Name
    gridItems[`${row},-5`] = {
      value: `${index + 1}`,
      color: 'stone',
    };
    gridItems[`${row},-4`] = {
      value: `${player.name.toUpperCase()}`,
      color: playerColor,
    };

    // Player Score
    gridItems[`${row},5`] = {
      value: `${player.score}`,
      color: index === 0 ? 'amber' : 'stone',
    };
  });

  // Restart Button
  gridItems['6,-2'] = {
    value: 'NOVO',
    onClick: leave,
    hover: true,
    color: 'stone',
  };
  gridItems['7,-1'] = {
    value: 'JOGO',
    onClick: leave,
    hover: true,
    color: 'stone',
  };

  return <GridLayout gridItems={gridItems} />;
}
