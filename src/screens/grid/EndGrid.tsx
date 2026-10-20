import { GridItems, GridLayout } from '@src/components/GridLayout';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import { getGridPlayerColor } from '@src/utils/helpers';

export function EndGrid() {
  const { gameData, leaveGame } = useGameBlocContext();

  const sortedPlayers = [...(gameData.players || [])].sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  );

  function handleRestart() {
    leaveGame();
    window.location.reload();
  }

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
      value: `${player.score || 0}`,
      color: index === 0 ? 'amber' : 'stone',
    };
  });

  // Restart Button
  gridItems['6,-2'] = {
    value: 'NOVO',
    onClick: handleRestart,
    hover: true,
    color: 'stone',
  };
  gridItems['7,-1'] = {
    value: 'JOGO',
    onClick: handleRestart,
    hover: true,
    color: 'stone',
  };

  return <GridLayout gridItems={gridItems} />;
}
