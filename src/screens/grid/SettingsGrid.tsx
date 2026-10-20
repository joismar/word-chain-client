import React from 'react';
import { GridItems, GridLayout } from '@src/components/GridLayout';

export type Config = ['3' | '5', 'true' | 'false'];

type SettingsGridProps = {
  config: Config;
  onChangeConfig: React.Dispatch<React.SetStateAction<Config>>;
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
    onChangeConfig((prev) => [prev[0] === '3' ? '5' : '3', prev[1]]);
  }

  function toggleRepetition() {
    if (!isHost) return;
    onChangeConfig((prev) => [prev[0], prev[1] === 'true' ? 'false' : 'true']);
  }

  const timeLabel = config[0] === '3' ? '3MIN' : '5MIN';
  const repLabel = config[1] === 'true' ? 'SIM' : 'NAO';

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
