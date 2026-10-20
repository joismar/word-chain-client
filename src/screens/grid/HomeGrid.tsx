import React from 'react';
import { Action } from '@shared/enums';
import { GridItems, GridLayout } from '@src/components/GridLayout';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';

export function HomeGrid() {
  const { sendEvent, isLoadingAction } = useGameBlocContext();

  const [mode, setMode] = React.useState<'menu' | 'host' | 'join'>('menu');
  const [player, setPlayer] = React.useState('');
  const [room, setRoom] = React.useState('');

  const isHosting = isLoadingAction(Action.HOST);
  const isJoining = isLoadingAction(Action.JOIN);
  const isLoading = isHosting || isJoining;

  function handleHostClick() {
    if (mode === 'menu') {
      setMode('host');
    }
  }

  function handleJoinClick() {
    if (mode === 'menu') {
      setMode('join');
    }
  }

  function handleBack() {
    setMode('menu');
    setPlayer('');
    setRoom('');
  }

  function handleSubmit() {
    if (isLoading) return;

    if (mode === 'host' && player.trim()) {
      sendEvent({
        action: Action.HOST,
        data: [player.trim()],
      });
    } else if (mode === 'join' && room.trim() && player.trim()) {
      sendEvent({
        action: Action.JOIN,
        data: [room.trim(), player.trim()],
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }

  const isHostMode = mode === 'host';
  const isJoinMode = mode === 'join';
  const isInputActive = isHostMode || isJoinMode;

  const firstMenuValue = isInputActive ? 'APELIDO' : 'CRIAR';
  const secondMenuValue = isJoinMode ? 'SALA' : isHostMode ? '      ' : 'ENTRAR';

  const gridItems: GridItems = {
    '-6,-5': {
      value: '<',
      onClick: isInputActive ? handleBack : undefined,
      hidden: !isInputActive,
      hover: isInputActive,
      color: 'rose',
    },
    '-4,-5': {
      value: firstMenuValue,
      onClick: mode === 'menu' ? handleHostClick : undefined,
      hover: mode === 'menu',
      color: 'amber',
    },
    '-3,-5': {
      value: player,
      variant: 'input',
      hidden: !isInputActive,
      maxSize: 10,
      fixedFocus: isInputActive && (!isJoinMode || !player),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlayer(e.target.value);
      },
      onKeyDown: handleKeyDown,
    },
    '-1,-5': {
      value: secondMenuValue,
      onClick: mode === 'menu' ? handleJoinClick : undefined,
      hover: mode === 'menu',
      color: 'amber',
      hidden: isHostMode,
    },
    '0,-5': {
      value: room,
      variant: 'input',
      hidden: !isJoinMode,
      maxSize: 6,
      fixedFocus: isJoinMode && !!player,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setRoom(e.target.value);
      },
      onKeyDown: handleKeyDown,
    },
    '4,5': {
      value: isLoading ? '...' : '↵',
      onClick: isInputActive ? handleSubmit : undefined,
      hover: isInputActive && !isLoading,
      color: 'emerald',
      hidden: !isInputActive,
    },
  };

  return <GridLayout gridItems={gridItems} />;
}
