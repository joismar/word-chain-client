import '@src/App.css';
import { Word } from '@src/components/Word';
import React from 'react';
import { Lobby } from '@src/screens/Lobby';
import { Game } from '@src/screens/Game';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import { Screens } from '@src/utils/types';
import { Home } from './screens/Home';
import { Keyboard } from './components/Keyboard';
import useIsMobile from './hooks/useIsMobile';

function App() {
  const [screen, setScreen] = React.useState<Screens>('home');
  const { gameData, connected } = useGameBlocContext();
  const isMobile = useIsMobile();

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
    <div className="flex flex-col items-center h-full w-[100vw]">
      <div className="flex justify-center items-center text-neutral-700 w-full p-5">
        <Word autoSize>word chain</Word>
      </div>
      <div className='flex-1 w-full p-5 sm:p-20'>
        {screenComponent}
      </div>
      {['game'].includes(screen) && isMobile && <Keyboard />}
      <div className='flex justify-between items-center w-full px-5 pb-1'>
        <div
          className={`px-2 my-1 rounded-full ${connectionStatusBg} text-[.5rem]`}
        >{connected ? 'Online' : 'Offline'}</div>
        <div className='text-[.5rem]'>Developed with ❤️ by @Joismar</div>
      </div>
    </div>
  );
}

export default App;
