import { Action } from '@shared/enums';
import { Word } from '@src/components/Word';
import { useInputManager } from '@src/hooks/useInputManager';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import React from 'react';

export function Home() {
  const { sendEvent } = useGameBlocContext();
  const [selection, setSelection] = React.useState<'host' | 'join'>();
  const [joinInput, setJoinInput] = React.useState<'game name' | 'player name'>(
    'player name'
  );
  const [playerName, setPlayerName] = React.useState('');
  const submitDependencyTree: [
    typeof selection,
    typeof joinInput,
    typeof playerName
  ] = [selection, joinInput, playerName];
  const dependenciesRef = React.useRef(submitDependencyTree);

  React.useEffect(() => {
    dependenciesRef.current = submitDependencyTree;
  }, submitDependencyTree);

  function onSubmit(value: string) {
    console.log(value);
    const [currentSelection, joinInput, playerName] = dependenciesRef.current;
    if (currentSelection) {
      if (currentSelection === Action.JOIN) {
        if (joinInput === 'player name') {
          setPlayerName(value);
          setValue('');
          setJoinInput('game name');
        } else if (joinInput === 'game name') {
          sendEvent({
            action: Action.JOIN,
            data: [value, playerName],
          });
        }
      } else if (currentSelection === Action.HOST) {
        sendEvent({
          action: Action.HOST,
          data: [value],
        });
      }
    }
  }

  const [value, setValue] = useInputManager({
    onSubmit,
  });

  function onJoinGame() {
    setValue('');
    setSelection('join');
  }

  function onNewGame() {
    setValue('');
    setJoinInput('player name');
    setSelection('host');
  }

  const joinGameSetted = selection === 'join';
  const newGameSetted = selection === 'host';
  const joinWrapClassName = !joinGameSetted ? 'h-0' : 'h-6';
  const newWrapClassName = !newGameSetted ? 'h-0' : 'h-6';
  const topWord = newGameSetted ? 'player name' : 'new';
  const bottomWord = joinGameSetted ? joinInput : 'join';
  const joinWordHover = joinGameSetted ? '' : ' group-hover:bg-orange-700';
  const newWordHover = newGameSetted ? '' : ' group-hover:bg-yellow-700';
  const joinWordClassName = newGameSetted
    ? 'bg-neutral-900 text-neutral-600'
    : 'bg-orange-800' + joinWordHover;
  const newWordClassName = joinGameSetted
    ? 'bg-neutral-900 text-neutral-600'
    : 'bg-yellow-800' + newWordHover;

  return (
    <div className="flex flex-col justify-center gap-2 h-[100%] w-[100%] p-20">
      <div
        className={`${newWrapClassName} overflow-hidden transition-[height]`}
      >
        <Word distance={3} blink>
          {value}
        </Word>
      </div>
      <Word
        distance={3}
        className={`group ${newGameSetted ? '' : 'cursor-pointer'}`}
        letterClassName={newWordClassName}
        onClick={onNewGame}
      >
        {topWord}
      </Word>
      <Word
        distance={3}
        className={`group ${joinGameSetted ? '' : 'cursor-pointer'}`}
        letterClassName={joinWordClassName}
        onClick={onJoinGame}
      >
        {bottomWord}
      </Word>
      <div
        className={`${joinWrapClassName} overflow-hidden transition-[height]`}
      >
        <Word distance={3} blink>
          {value}
        </Word>
      </div>
    </div>
  );
}
