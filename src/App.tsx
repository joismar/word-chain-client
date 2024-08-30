import '@src/App.css';
import { Word } from '@src/components/Word';
import React from 'react';
import { Lobby } from '@src/screens/Lobby';
import { Game } from '@src/screens/Game';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import { Screens } from '@src/utils/types';
import { Home } from './screens/Home';
import useIsMobile from './hooks/useIsMobile';
import { useVisualViewportH } from './hooks/useVisualViewportH';

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

  const visualViewportH = useVisualViewportH();

  const logoHeight = isMobile ? 'h-10' : 'h-14'

  return (
    <div className="flex flex-col items-center w-[100vw]" style={{
      height: visualViewportH ? `${visualViewportH}px` : '100dvh'
    }}>
      {screen != 'game' && <div className={`flex justify-center items-center text-neutral-700 ${logoHeight}`}>
        <Word distance={isMobile ? 4 : 3} color='bg-neutral-300'>word chain</Word>
      </div>}
      <div className='flex-1 w-full px-5 pb-3 sm:px-20 max-w-[1000px]'>
        {screenComponent}
      </div>
      <div className='flex justify-between items-center w-full px-5 pb-1'>
        <div
          className={`px-2 my-1 rounded-full ${connectionStatusBg} text-[.5rem]`}
        >{connected ? 'Online' : 'Offline'}</div>
        <div className='text-[.5rem]'>WordChain ©️ Developed with ❤️ by @Joismar</div>
      </div>
    </div>
  );
}

export default App;
