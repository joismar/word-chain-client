import React from 'react';
import { Action } from '@shared/enums';
import { GridItems, GridLayout } from '@src/components/GridLayout';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import { getGridPlayerColor } from '@src/utils/helpers';
import { useEventSystem } from '@src/hooks/useEventSystem';
import { Config, SettingsGrid } from './SettingsGrid';

type LobbyGridProps = {
  onBack: () => void;
}

export function LobbyGrid({ onBack }: LobbyGridProps) {
  const {
    gameData,
    sendEvent,
    playerReady,
    isHost,
    isLoadingAction,
    leaveGame,
  } = useGameBlocContext();

  const { emit } = useEventSystem();
  const [config, setConfig] = React.useState<Config>(['3', 'true']);
  const [copied, setCopied] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);

  function handleBack() {
    leaveGame();
    onBack();
  }

  const isStarting = isLoadingAction(Action.START);
  const isStatusLoading = isLoadingAction(Action.STATUS);
  const isLoading = isStarting || isStatusLoading;

  function onStart() {
    if (isLoading) return;
    sendEvent({
      action: Action.START,
      data: config,
    });
  }

  function onReady() {
    if (isLoading) return;
    sendEvent({
      action: Action.STATUS,
      data: ['1'],
    });
  }

  function onCopyClick() {
    if (gameData?.name) {
      navigator.clipboard.writeText(gameData.name);
      setCopied(true);
      emit('infoToast', `Código da sala copiado: ${gameData.name.toUpperCase()}`);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (showSettings) {
    return (
      <SettingsGrid
        config={config}
        onChangeConfig={setConfig}
        onBack={() => setShowSettings(false)}
        isHost={isHost()}
      />
    );
  }

  const roomName = (gameData?.name || 'SALA').toUpperCase();

  const gridItems: GridItems = {
    '-7,-5': {
      value: '<',
      color: 'emerald',
      hover: true,
      onClick: handleBack,
    },
    '-7,5': {
      value: '⚙',
      color: 'stone',
      hover: true,
      onClick: () => setShowSettings(true),
    },
    '-5,-5': {
      value: 'SALA',
      color: 'stone',
    },
    '-4,-5': {
      value: copied ? 'COPIADO' : roomName,
      onClick: onCopyClick,
      hover: true,
      color: copied ? 'emerald' : 'amber',
    },
  };

  // Render players on the grid
  (gameData.players || []).forEach((player, index) => {
    const row = -2 + index;
    const isReady = playerReady(player.status);
    const playerColor = getGridPlayerColor(player.color);

    gridItems[`${row},-5`] = {
      value: player.name.toUpperCase(),
      color: playerColor,
    };

    gridItems[`${row},${player.name.length - 4}`] = {
      value: isReady ? '✓' : '✕',
      color: isReady ? 'emerald' : 'rose',
    };
  });

  // Action buttons
  gridItems['4,-5'] = {
    value: isStatusLoading ? '...' : 'PRONTO',
    onClick: onReady,
    hover: !isLoading,
    color: 'emerald',
  };

  if (isHost()) {
    gridItems['5,-5'] = {
      value: isStarting ? '...' : 'INICIAR',
      onClick: onStart,
      hover: !isLoading,
      color: 'amber',
    };
  }

  return <GridLayout gridItems={gridItems} />;
}

