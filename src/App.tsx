import '@src/App.css';
import { GridLayout } from '@src/components/GridLayout';
import { useGame } from '@src/state/useGame';
import { HomeGrid } from './screens/grid/HomeGrid';
import { LobbyGrid } from './screens/grid/LobbyGrid';
import { GameGrid } from './screens/grid/GameGrid';
import { EndGrid } from './screens/grid/EndGrid';

function App() {
  const { screen } = useGame();

  switch (screen) {
    case 'loading':
      return <GridLayout gridItems={{ '0,-5': { value: 'CONECTANDO', color: 'stone' } }} />;
    case 'lobby':
      return <LobbyGrid />;
    case 'game':
      return <GameGrid />;
    case 'end':
      return <EndGrid />;
    case 'home':
    default:
      return <HomeGrid />;
  }
}

export default App;
