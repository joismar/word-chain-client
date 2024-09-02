import { Action } from '@shared/enums';
import { Input } from '@src/components/Input';
import { Spinner } from '@src/components/Spinner';
import { Word } from '@src/components/Word';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import React from 'react';

export function Home() {
  const { sendEvent, isLoadingAction } = useGameBlocContext();
  const [selection, setSelection] = React.useState<'host' | 'join'>();
  const [activeInput, setActiveInput] = React.useState<'game' | 'player'>(
    'player'
  );
  const [joinPlayerValue, setJoinPlayerValue] = React.useState('');
  const [value, setValue] = React.useState('');

  const selectionRef = React.useRef(selection);

  React.useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  function onSubmit(gameName?: string, playerName?: string) {
    const currentSelection = selectionRef.current;
    if (currentSelection) {
      if (currentSelection === Action.JOIN && activeInput === 'game') {
        sendEvent({
          action: Action.JOIN,
          data: [gameName!, joinPlayerValue!],
        });
      } else if (currentSelection === Action.HOST) {
        sendEvent({
          action: Action.HOST,
          data: [playerName!],
        });
      }
    }
  }

  function onJoinGame() {
    setValue('');
    setActiveInput('player');
    setSelection('join');
  }

  function onNewGame() {
    setValue('');
    setActiveInput('player');
    setSelection('host');
  }

  const joinGameSetted = selection === 'join';
  const newGameSetted = selection === 'host';
  const joinWrapClassName = !joinGameSetted ? 'h-0' : 'h-6';
  const newWrapClassName = !newGameSetted ? 'h-0' : 'h-6';
  const topWord = newGameSetted ? 'apelido' : 'novo';
  const bottomWord = joinGameSetted ? {
    'player': 'apelido',
    'game': 'jogo',
  }[activeInput] : 'entrar';
  const joinWordHover = joinGameSetted ? '' : ' group-hover:bg-orange-700';
  const newWordHover = newGameSetted ? '' : ' group-hover:bg-yellow-700';
  const joinWordClassName = newGameSetted
    ? 'bg-neutral-900 text-neutral-600'
    : 'bg-orange-800' + joinWordHover;
  const newWordClassName = joinGameSetted
    ? 'bg-neutral-900 text-neutral-600'
    : 'bg-yellow-800' + newWordHover;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget)
      if (activeInput === 'player') {
        setValue('');
        setActiveInput('game');
        setJoinPlayerValue(formData.get('player-name')?.toString() || '')
      }
    onSubmit(formData.get('game-name')?.toString(), formData.get('player-name')?.toString())
  }

  const gameInput = () => <Input name="game-name" value={value} onChange={handleInputChange} distance={3} fixedFocus/>
  const playerInput = () => <Input name="player-name" value={value} onChange={handleInputChange} distance={3} fixedFocus/>

  const isLoading = isLoadingAction(Action.HOST) || isLoadingAction(Action.JOIN);

  return (
    <form onSubmit={handleSubmit} className='h-full'>
      {isLoading && <Spinner />}
      <div className="flex flex-col justify-center gap-2 h-[100%]">
        <div
          className={`${newWrapClassName} overflow-hidden transition-[height] w-full`}
        >      
          {newGameSetted && playerInput()}
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
          {joinGameSetted && activeInput === 'player' && playerInput()}
          {joinGameSetted && activeInput === 'game' && gameInput()}
        </div>
      </div>
      <input type='submit' hidden />
    </form>
  );
}
