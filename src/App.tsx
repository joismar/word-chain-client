import '@src/App.css';
import { Word } from '@src/components/Word';
import React from 'react';
import { Lobby } from '@src/screens/Lobby';
import { Game } from '@src/screens/Game';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import { Screens } from '@src/utils/types';
import { Home } from './screens/Home';
import { Keyboard } from './components/Keyboard';

function App() {
  const [screen, setScreen] = React.useState<Screens>('home');
  const { gameData, connected } = useGameBlocContext();

  React.useEffect(() => {
    if (gameData.status === 0) {
      setScreen('lobby');
    } else if (gameData.status === 1) {
      setScreen('game');
    }
  }, [gameData.status]);

  const screenComponent = (() => {
    switch (screen) {
      case 'home':
        return <Home />;
      case 'lobby':
        return <Lobby />;
      case 'game':
        return <Game />;
    }
  })();

  const connectionStatusBg = connected ? 'bg-green-600' : 'bg-red-600';

  return (
    <div className="flex flex-col items-center h-[100vh] w-[100vw]">
      <div className="flex justify-center items-center h-20 text-neutral-700 w-full px-5">
        <Word autoSize>word chain</Word>
      </div>
      <div className='flex-1 w-full'>
        {screenComponent}
      </div>
      <Keyboard />
      <div
        className={`absolute h-4 w-4 bottom-5 left-5 rounded-full ${connectionStatusBg}`}
      ></div>
    </div>
  );
}

export default App;
