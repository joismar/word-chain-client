import React from 'react';
import { GridItems, GridLayout } from '@src/components/GridLayout';
import type { GameConfig } from '@src/protocol/schema';
import { useGame } from '@src/state/useGame';
import { getGridPlayerColor } from '@src/utils/helpers';
import { useEventSystem } from '@src/hooks/useEventSystem';
import { SettingsGrid } from './SettingsGrid';

export function LobbyGrid() {
  const { game, player, isHost, isPending, setReady, start, leave } = useGame();

  const { emit } = useEventSystem();
  const [config, setConfig] = React.useState<GameConfig>({ time: 3, repetition: true });
  const [copied, setCopied] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);

  const isStarting = isPending('start');
  const isStatusLoading = isPending('ready');
  const isLoading = isStarting || isStatusLoading;
  const amReady = game?.players.find((p) => p.id === player?.id)?.status === 'ready';

  function onStart() {
    if (isLoading) return;
    start(config);
  }

  function onReady() {
    if (isLoading) return;
    setReady(!amReady);
  }

  function onCopyClick() {
    if (game?.name) {
      navigator.clipboard.writeText(game.name);
      setCopied(true);
      emit('infoToast', `Código da sala copiado: ${game.name.toUpperCase()}`);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (showSettings) {
    return (
      <SettingsGrid
        config={config}
        onChangeConfig={setConfig}
        onBack={() => setShowSettings(false)}
        isHost={isHost}
      />
    );
  }

  const roomName = (game?.name || 'SALA').toUpperCase();

  const gridItems: GridItems = {
    '-7,-5': {
      value: '<',
      color: 'emerald',
      hover: true,
      onClick: leave,
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
  (game?.players ?? []).forEach((member, index) => {
    const row = -2 + index;
    const isReady = member.status === 'ready';
    const playerColor = getGridPlayerColor(member.color);

    gridItems[`${row},-5`] = {
      value: member.name.toUpperCase(),
      color: playerColor,
    };

    gridItems[`${row},${member.name.length - 4}`] = {
      value: isReady ? '✓' : '✕',
      color: isReady ? 'emerald' : 'rose',
    };
  });

  // Action buttons
  gridItems['4,-5'] = {
    value: isStatusLoading ? '...' : amReady ? 'ESPERAR' : 'PRONTO',
    onClick: onReady,
    hover: !isLoading,
    color: 'emerald',
  };

  if (isHost) {
    gridItems['5,-5'] = {
      value: isStarting ? '...' : 'INICIAR',
      onClick: onStart,
      hover: !isLoading,
      color: 'amber',
    };
  }

  return <GridLayout gridItems={gridItems} />;
}
