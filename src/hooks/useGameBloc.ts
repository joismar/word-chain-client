import { useEffect, useState } from 'react';
import { GameBloc } from '@bloc/GameBloc';
import { SocketWrapper } from '@shared/SocketWrapper';
import { EventAction, GameData, Player } from '@shared/interfaces';
import { SocketState } from '@shared/enums';

const socket = new SocketWrapper();
const gameBloc = new GameBloc(socket);

export function useGameBloc() {
  const [gameData, setGameData] = useState<GameData>({} as GameData);
  const [playerData, setPlayerData] = useState<Player>({} as Player);
  const [errorData, setErrorData] = useState<any>({});
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    const game = gameBloc.gameStream.subscribe((data) => {
      setGameData(data);
    });

    const player = gameBloc.playerStream.subscribe((data) => {
      setPlayerData(data);
    });

    const error = gameBloc.errorStream.subscribe((data) => {
      setErrorData(data);
    });

    const connection = gameBloc.connectionStream.subscribe((data) => {
      setConnected(data === SocketState.CONNECTED);
    });

    return () => {
      game.unsubscribe();
      player.unsubscribe();
      connection.unsubscribe();
      error.unsubscribe();
      socket.socket.readyState === 1 && gameBloc.closeConnection();
    };
  }, []);

  const findPlayerById = (id: string) => {
    return gameData.players.find((player) => player.id === id);
  };

  const isMyTurn = () => {
    const playerIndex = gameData.players.findIndex(
      (player) => player.id === playerData.id
    );
    return playerIndex === gameData.turn;
  };

  const findTurnPlayer = () => {
    return gameData.players[gameData.turn];
  };

  const sendEvent = (event: EventAction) => {
    event.data = event.data.map(value => value.toLowerCase());
    gameBloc.sendEvent(event);
  };

  return {
    gameData,
    playerData,
    sendEvent,
    connected,
    errorData,
    findPlayerById,
    isMyTurn,
    findTurnPlayer,
  };
}
