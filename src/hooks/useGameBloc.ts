import { useEffect, useState } from 'react';
import { GameBloc } from '@bloc/GameBloc';
import { SocketWrapper } from '@shared/SocketWrapper';
import { EventAction, GameData, Player } from '@shared/interfaces';
import { Action, PlayerStatus, SocketState } from '@shared/enums';
import { useEventSystem } from './useEventSystem';

const socket = new SocketWrapper();
const gameBloc = new GameBloc(socket);

export function useGameBloc() {
  const [gameData, setGameData] = useState<GameData>({} as GameData);
  const [playerData, setPlayerData] = useState<Player>({} as Player);
  const [errorData, setErrorData] = useState<any>({});
  const [connected, setConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<{
    [key in Action]: boolean
  }>(Object.fromEntries(Object.values(Action).map((action) => [action, false])) as any);

  function updateLoadingState(action: Action, state: boolean) {
    setIsLoading((prev) => ({ ...prev, [action]: state }));
  }

  const { emit } = useEventSystem();
  
  useEffect(() => {
    const game = gameBloc.gameStream.subscribe((data) => {
      setGameData(data);
    });

    const player = gameBloc.playerStream.subscribe((data) => {
      setPlayerData(data);
    });

    const error = gameBloc.errorStream.subscribe((data) => {
      emit('infoToast', data.message);
      setErrorData(data);
    });

    const connection = gameBloc.connectionStream.subscribe((data) => {
      setConnected(data === SocketState.CONNECTED);
    });

    const actionState = gameBloc.actionStateStream.subscribe((data) => {
      updateLoadingState(data, false);
    });

    return () => {
      game.unsubscribe();
      player.unsubscribe();
      connection.unsubscribe();
      error.unsubscribe();
      actionState.unsubscribe();
      socket.socket.readyState === 1 && gameBloc.closeConnection();
    };
  }, []);

  function findPlayerById(id: string) {
    return gameData.players.find((player) => player.id === id);
  };

  function isMyTurn() {
    const playerIndex = gameData.players.findIndex(
      (player) => player.id === playerData.id
    );
    return playerIndex === gameData.turn;
  };

  function findTurnPlayer() {
    return gameData.players[gameData.turn];
  };

  async function sendEvent(event: EventAction) {
    updateLoadingState(event.action, true);
    event.data = event.data.map(value => value.toLowerCase());
    gameBloc.sendEvent(event);
  };

  function playerReady(status: PlayerStatus) {
    return status === PlayerStatus.READY;
  } 

  function isHost() {
    return playerData.id === playerData.session_id;
  }

  function isLoadingAction(action: Action) {
    return isLoading[action];
  }

  return {
    gameData,
    playerData,
    sendEvent,
    connected,
    errorData,
    findPlayerById,
    isMyTurn,
    findTurnPlayer,
    socket,
    playerReady,
    isHost,
    isLoadingAction,
  };
}
