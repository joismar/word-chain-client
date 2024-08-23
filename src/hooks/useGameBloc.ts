import { useEffect, useState } from 'react';
import { GameBloc } from '@bloc/GameBloc';
import { SocketWrapper } from '@shared/SocketWrapper';
import { EventAction, GameData, Player } from '@shared/interfaces';

const webSocket = new WebSocket(
  'wss://h9qktxoj4a.execute-api.sa-east-1.amazonaws.com/dev'
);
const socket = new SocketWrapper(webSocket);
const gameBloc = new GameBloc(socket);

export function useGameBloc() {
  const [gameData, setGameData] = useState<GameData>({} as GameData);
  const [playerData, setPlayerData] = useState<Player>({} as Player);
  const [errorData, setErrorData] = useState<any>({});
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    const game = gameBloc.gameStream.subscribe((data: any) => {
      setGameData(data);
    });

    const player = gameBloc.playerStream.subscribe((data: any) => {
      setPlayerData(data);
    });

    const error = gameBloc.errorStream.subscribe((data: any) => {
      setErrorData(data);
    });

    const connection = gameBloc.connectionStream.subscribe((data: any) => {
      setConnected(data);
    });

    return () => {
      game.unsubscribe();
      player.unsubscribe();
      connection.unsubscribe();
      error.unsubscribe();
      if (webSocket.readyState === 1) gameBloc.closeConnection();
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
    console.log('Sended:', event);
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
