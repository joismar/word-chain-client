import React from 'react';
import { GridItems, GridLayout } from '@src/components/GridLayout';
import type { GameConfig } from '@src/protocol/schema';

type SettingsGridProps = {
  config: GameConfig;
  onChangeConfig: React.Dispatch<React.SetStateAction<GameConfig>>;
  onBack: () => void;
  isHost: boolean;
};

export function SettingsGrid({
  config,
  onChangeConfig,
  onBack,
  isHost,
}: SettingsGridProps) {
  function toggleTime() {
    if (!isHost) return;
    onChangeConfig((prev) => ({ ...prev, time: prev.time === 3 ? 5 : 3 }));
  }

  function toggleRepetition() {
    if (!isHost) return;
    onChangeConfig((prev) => ({ ...prev, repetition: !prev.repetition }));
  }

  const timeLabel = `${config.time}MIN`;
  const repLabel = config.repetition ? 'SIM' : 'NAO';

  const gridItems: GridItems = {
    '-7,-5': {
      value: '<',
      color: 'emerald',
      hover: true,
      onClick: onBack,
    },
    '-5,-5': {
      value: 'CONFIG',
      color: 'amber',
    },
    '-2,-5': {
      value: 'TEMPO',
      color: 'stone',
    },
    '-2,2': {
      value: timeLabel,
      onClick: isHost ? toggleTime : undefined,
      hover: isHost,
      color: isHost ? 'sky' : 'stone',
    },
    '0,-5': {
      value: 'REPETIR',
      color: 'stone',
    },
    '0,3': {
      value: repLabel,
      onClick: isHost ? toggleRepetition : undefined,
      hover: isHost,
      color: isHost ? 'purple' : 'stone',
    },
    '4,-5': {
      value: 'VOLTAR',
      onClick: onBack,
      hover: true,
      color: 'emerald',
    },
  };

  return <GridLayout gridItems={gridItems} />;
}
