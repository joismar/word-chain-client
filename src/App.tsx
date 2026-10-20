import '@src/App.css';
import React from 'react';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import { Screens } from '@src/utils/types';
import { HomeGrid } from './screens/grid/HomeGrid';
import { LobbyGrid } from './screens/grid/LobbyGrid';
import { GameGrid } from './screens/grid/GameGrid';
import { EndGrid } from './screens/grid/EndGrid';

function App() {
  const { gameData } = useGameBlocContext();
  const [screen, setScreen] = React.useState<Screens>('home');

  React.useEffect(() => {
    if (gameData.status === 0) {
      setScreen('lobby');
    } else if (gameData.status === 1) {
      setScreen('game');
    } else if (gameData.status === 2) {
      setScreen('end');
    } else if (gameData.status === undefined) {
      setScreen('home');
    }
  }, [gameData.status]);

  const renderScreen = () => {
    switch (screen) {
      case 'lobby':
        return <LobbyGrid onBack={() => setScreen('home')} />;
      case 'game':
        return <GameGrid />;
      case 'end':
        return <EndGrid />;
      case 'home':
      default:
        return <HomeGrid />;
    }
  };

  return <>{renderScreen()}</>;
}

export default App;
