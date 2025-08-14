import '@src/App.css';
import { Word } from '@src/components/Word';
import React from 'react';
import { Lobby } from '@src/screens/Lobby';
import { Game } from '@src/screens/Game';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import { Screens } from '@src/utils/types';
import { Home } from './screens/Home';
import useIsMobile from './hooks/useIsMobile';
import { useVisualViewport } from './hooks/useVisualViewport';
import { End } from './screens/End';
import { GridItems, GridItemKey, GridLayout } from './components/GridLayout';

function App() {
  // const [screen, setScreen] = React.useState<Screens>('home');
  // const { gameData, connected } = useGameBlocContext();
  // const isMobile = useIsMobile();

  // React.useEffect(() => {
  //   if (gameData.status === 0) {
  //     setScreen('lobby');
  //   } else if (gameData.status === 1) {
  //     setScreen('game');
  //   } else if (gameData.status === 2) {
  //     setScreen('end');
  //   }
  // }, [gameData.status]);

  // const screenComponent = (() => {
  //   switch (screen) {
  //     case 'home':
  //       return <Home />;
  //     case 'lobby':
  //       return <Lobby />;
  //     case 'game':
  //       return <Game />;
  //     case 'end':
  //       return <End />;
  //   }
  // })();

  // const connectionStatusBg = connected ? 'bg-green-600' : 'bg-red-600';

  // const {height: visualViewportH} = useVisualViewport();

  // const logoHeight = isMobile ? 'h-10' : 'h-14'

  const [hiddenState, setHiddenState] = React.useState({
    playerInput: true,
    roomInput: true,
    backButton: true,
    roomButton: false,
  });
  const [firstMenuValue, setFirstMenuValue] = React.useState("CRIAR");
  const [secondMenuValue, setSecondMenuValue] = React.useState("ENTRAR");
  const [player, setPlayer] = React.useState("");
  const [room, setRoom] = React.useState("");

  function handleHostClick() {
    setHiddenState(state => ({
      ...state,
      playerInput: false,
      roomInput: true,
      backButton: false,
      roomButton: true,
    }));
    setFirstMenuValue("APELIDO");
  }

  function handleJoinClick() {
    setHiddenState(state => ({
      ...state,
      playerInput: false,
      roomInput: false,
      backButton: false,
    }));
    setFirstMenuValue("APELIDO");
    setSecondMenuValue("SALA");
  }

  function handleBack() {
    setHiddenState(state => ({
      ...state,
      playerInput: true,
      roomInput: true,
      backButton: true,
      roomButton: false,
    }));
    setFirstMenuValue("CRIAR");
    setSecondMenuValue("ENTRAR");
  }

  const gridItems: GridItems = {
    "-4,-5": {
      value: "<",
      onClick: !hiddenState.backButton ? handleBack : undefined,
      hidden: hiddenState.backButton,
      hover: !hiddenState.backButton,
      color: "rose",
    },
    "-4,-3": {
      value: firstMenuValue,
      onClick: () => handleHostClick(),
      hover: true,
      color: "amber",
    },
    "-3,-3": {
      value: player,
      variant: "input",
      hidden: hiddenState.playerInput,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlayer(e.target.value);
      },
    },
    "-1,-3": {
      value: hiddenState.roomButton ? "      " : secondMenuValue,
      onClick: !hiddenState.roomButton ? handleJoinClick : undefined,
      hover: !hiddenState.roomButton,
      color: "amber",
    },
    "0,-3": {
      value: room,
      variant: "input",
      hidden: hiddenState.roomInput,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setRoom(e.target.value);
      },
    },
    "4,5": {
      value: "↵",
      hover: true,
      color: "emerald"
    }
  }

  return (
    <>
      <GridLayout gridItems={gridItems}/>
    </>
  );
}

export default App;
