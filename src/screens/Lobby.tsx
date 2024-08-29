import { Action, PlayerStatus } from '@shared/enums';
import { Button } from '@src/components/Button';
import { Letter } from '@src/components/Letter';
import { Word } from '@src/components/Word';
import { ClipboardIcon } from '@src/images/ClipboardIcon';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';

export function Lobby() {
  const { sendEvent, gameData } = useGameBlocContext();

  function onStart() {
    sendEvent({
      action: Action.START,
      data: [],
    });
  }

  function onReady() {
    sendEvent({
      action: Action.STATUS,
      data: ['1'],
    });
  }

  function playerReady(status: PlayerStatus) {
    return status === PlayerStatus.READY;
  }

  function onCopyClick() {
    navigator.clipboard.writeText(gameData?.name);
  }

  return (
    <div className="flex flex-col items-start justify-center gap-2 h-[100%] pt-5 pb-10">
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
      <div className="border-t border-neutral-600 my-2 w-[100%]"></div>
      <div className="flex flex-col flex-1 gap-1">
        {gameData.players?.map((player) => (
          <div className="flex gap-2" key={player.id}>
            <Letter
              distance={3}
              className={
                playerReady(player.status) ? 'bg-teal-700' : 'bg-orange-700'
              }
            >
              {playerReady(player.status) ? '✓' : '✕'}
            </Letter>
            <Word distance={3}>{player.name}</Word>
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
          ready
        </Word>
        <Word
          distance={3}
          onClick={onStart}
          className="group cursor-pointer self-end"
          letterClassName="bg-orange-800 group-hover:bg-orange-700"
        >
          start
        </Word>
      </div>
    </div>
  );
}
