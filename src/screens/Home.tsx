import { Action } from '@shared/enums';
import { Input } from '@src/components/Input';
import { Word } from '@src/components/Word';
import { useSubmit } from '@src/hooks/useSubmit';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import React from 'react';

export function Home() {
  const { sendEvent } = useGameBlocContext();
  const [selection, setSelection] = React.useState<'host' | 'join'>();
  const [activeInput, setActiveInput] = React.useState<'game name' | 'player name'>(
    'player name'
  );
  const [playerName, setPlayerName] = React.useState('');
  const [value, setValue] = React.useState('');
  const submitDependencyTree: [
    typeof selection,
    typeof activeInput,
    typeof playerName,
    typeof value,
  ] = [selection, activeInput, playerName, value];
  const dependenciesRef = React.useRef(submitDependencyTree);

  React.useEffect(() => {
    dependenciesRef.current = submitDependencyTree;
  }, submitDependencyTree);

  function onSubmit(currentSelection: typeof selection, gameName: string, playerName: string) {
    // const [currentSelection, activeInput, playerName, valueRef] = dependenciesRef.current;
    if (currentSelection) {
      if (currentSelection === Action.JOIN) {
        if (activeInput === 'player name') {
          setValue('');
          setPlayerName(playerName);
          setActiveInput('game name');
        } else if (activeInput === 'game name') {
          sendEvent({
            action: Action.JOIN,
            data: [gameName, playerName],
          });
        }
      } else if (currentSelection === Action.HOST) {
        sendEvent({
          action: Action.HOST,
          data: [gameName],
        });
      }
    }
  }

  function onJoinGame() {
    setActiveInput('player name');
    setSelection('join');
  }

  function onNewGame() {
    setActiveInput('player name');
    setSelection('host');
  }

  const joinGameSetted = selection === 'join';
  const newGameSetted = selection === 'host';
  const joinWrapClassName = !joinGameSetted ? 'h-0' : 'h-6';
  const newWrapClassName = !newGameSetted ? 'h-0' : 'h-6';
  const topWord = newGameSetted ? 'player name' : 'new';
  const bottomWord = joinGameSetted ? activeInput : 'join';
  const joinWordHover = joinGameSetted ? '' : ' group-hover:bg-orange-700';
  const newWordHover = newGameSetted ? '' : ' group-hover:bg-yellow-700';
  const joinWordClassName = newGameSetted
    ? 'bg-neutral-900 text-neutral-600'
    : 'bg-orange-800' + joinWordHover;
  const newWordClassName = joinGameSetted
    ? 'bg-neutral-900 text-neutral-600'
    : 'bg-yellow-800' + newWordHover;

  // const [joinValue, setJoinValue] = React.useState('');

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget)
    console.log(Array.from(formData.entries()))
  }

  const gameInput = () => <Input name="game-name" value={value} onChange={handleInputChange} distance={3} autoFocus={activeInput === 'game name'}/>
  const playerInput = () => <Input name="player-name" value={value} onChange={handleInputChange} distance={3} autoFocus={activeInput === 'player name'}/>

  return (
    <form onSubmit={handleSubmit} className='h-full'>
    <div className="flex flex-col justify-center gap-2 h-[100%]">
      <div
        className={`${newWrapClassName} overflow-hidden transition-[height] w-full`}
      >      
        {newGameSetted && gameInput()}
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
        className={`${joinWrapClassName} overflow-hidden transition-[height] w-full`}
      >
        {joinGameSetted && activeInput === 'game name' && gameInput()}
        {joinGameSetted && activeInput === 'player name' && playerInput()}
      </div>
    </div>
    </form>
  );
}
