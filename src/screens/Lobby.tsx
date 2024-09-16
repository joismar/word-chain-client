import { Action } from '@shared/enums';
import { Avatar } from '@src/components/Avatar';
import { Button } from '@src/components/Button';
import { CheckBox } from '@src/components/Checkbox';
import { Letter } from '@src/components/Letter';
import { Modal } from '@src/components/Modal';
import { Select } from '@src/components/Select';
import { Spinner } from '@src/components/Spinner';
import { Word } from '@src/components/Word';
import { ClipboardIcon } from '@src/icons/ClipboardIcon';
import { CogIcon } from '@src/icons/CogIcon';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import { getCSSPlayerColor } from '@src/utils/helpers';
import React from 'react';

type Config = ['3' | '5', 'true' | 'false'];

export function Lobby() {
  const { sendEvent, gameData, playerReady, isHost, isLoadingAction } = useGameBlocContext();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [config, setConfig] = React.useState<Config>(['3', 'true']);
  
  function onStart() {
    sendEvent({
      action: Action.START,
      data: config,
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

  const isLoading = isLoadingAction(Action.START) || isLoadingAction(Action.STATUS);

  const timeOptions = [{
    value: '3',
    label: '3 min'
  }, {
    value: '5',
    label: '5 min'
  }]

  function onTimeChange(value: string) {
    setConfig((prev) => {
      return [value as Config[0], prev[1]]
    })
  }

  function onRepeatChange(checked: boolean) {
    setConfig((prev) => {
      return [prev[0], checked.toString() as Config[1]]
    })
  }

  return (
    <div className="flex flex-col items-start justify-center gap-2 h-[100%] pt-5 pb-10">
      {isLoading && <Spinner />}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className='flex flex-col gap-2'>
          <Select label='Tempo de jogo' options={timeOptions} onChange={onTimeChange} value={config[0]}/>
          <CheckBox label='Perde a vez ao repetir' onChange={onRepeatChange} checked={config[1] === "true"}/>
        </div>
      </Modal>
      <div className="flex justify-between w-full">
        <Button
            distance={3}
            className="cursor-pointer hover:bg-neutral-900"
            onClick={() => setIsModalOpen(true)}
          >
            <CogIcon className="size-4" />
        </Button>
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
