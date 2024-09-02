import { Action } from '@shared/enums';
import { Avatar } from '@src/components/Avatar';
import { Button } from '@src/components/Button';
import { Letter } from '@src/components/Letter';
import { Select } from '@src/components/Select';
import { Spinner } from '@src/components/Spinner';
import { Word } from '@src/components/Word';
import { ClipboardIcon } from '@src/images/ClipboardIcon';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import { getCSSPlayerColor } from '@src/utils/helpers';
import React from 'react';

type GameMode = 'time' | 'repetition';

export function Lobby() {
  const { sendEvent, gameData, playerReady, isHost, isLoadingAction } = useGameBlocContext();
  const [gameMode, setGameMode] = React.useState<GameMode>('time');
  
  function onStart() {
    sendEvent({
      action: Action.START,
      data: [{'time': '0', 'repetition': '1'}[gameMode]],
    });
  }

  function onReady() {
    sendEvent({
      action: Action.STATUS,
      data: ['1'],
    });
  }

  function onCopyClick() {
    navigator.clipboard.writeText(gameData?.name);
  }

  const selectOptions = [
    {value: 'time', label: 'Tempo'},
    {value: 'repetition', label: 'Repetição'},
  ]

  function onSelectChange(value: string) {
    setGameMode(value as GameMode);
  }

  const isLoading = isLoadingAction(Action.START) || isLoadingAction(Action.STATUS);

  return (
    <div className="flex flex-col items-start justify-center gap-2 h-[100%] pt-5 pb-10">
      {isLoading && <Spinner />}
      <div className="flex justify-between w-full">
        <div className="w-40"><Select options={selectOptions} value={gameMode} onChange={onSelectChange} /></div>
        <div className="flex gap-1 self-end">
          <Button distance={3} className="">
            {gameData?.name.toUpperCase()}
          </Button>
          <Button
            distance={3}
            className="cursor-pointer hover:bg-neutral-900"
            onClick={onCopyClick}
          >
            <ClipboardIcon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="border-t border-neutral-600 my-2 w-[100%]"></div>
      <div className="flex flex-col flex-1 gap-1 w-full">
        {gameData.players?.map((player) => (
          <div className="flex justify-between w-full" key={player.id}>
            <div className='flex gap-2'>
              <Avatar distance={3} color={getCSSPlayerColor(player.color)} />
              <Word distance={3}>{player.name}</Word>
            </div>
            <Letter
              distance={3}
              className={
                playerReady(player.status) ? 'bg-teal-700' : 'bg-orange-700'
              }
            >
              {playerReady(player.status) ? '✓' : '✕'}
            </Letter>
          </div>
        ))}
      </div>
      <div className="border-t border-neutral-600 my-2 w-[100%]"></div>
      <div className="flex justify-between w-[100%]">
        <Word
          distance={3}
          onClick={onReady}
          className="group cursor-pointer self-end"
          letterClassName="bg-teal-800 group-hover:bg-teal-700"
        >
          pronto
        </Word>
        {isHost() && <Word
          distance={3}
          onClick={onStart}
          className="group cursor-pointer self-end"
          letterClassName="bg-orange-800 group-hover:bg-orange-700"
        >
          iniciar
        </Word>}
      </div>
    </div>
  );
}
