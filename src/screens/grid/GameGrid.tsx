import React from 'react';
import { GridColor, GridItems, GridLayout } from '@src/components/GridLayout';
import { useGame, useNow } from '@src/state/useGame';
import { countOverlapStartEnd } from '@src/utils/helpers';

const seconds = (ms: number) => Math.ceil(ms / 1000);

export function GameGrid() {
  const { game, isMyTurn, turnPlayer, isPending, clock, playWord, pass } = useGame();

  const [inputWord, setInputWord] = React.useState('');
  // Timers are read from the server's deadlines on every tick, never counted down.
  const { startsInMs, matchMs, turnMs } = clock(useNow());

  const chain = game?.chain ?? [];
  const started = startsInMs === 0;
  const canPlay = isMyTurn && started && !isPending('word', 'pass');

  function handleWordSubmit() {
    if (!inputWord.trim() || !canPlay) return;
    playWord(inputWord);
    setInputWord('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleWordSubmit();
    }
  }

  function handlePass() {
    if (!canPlay) return;
    pass();
  }

  // Format timer MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const gridItems: GridItems = {};

  // 1. Top Bar: Timers
  // Match timer at top right
  if (matchMs !== null) {
    const matchSeconds = seconds(matchMs);
    gridItems['-5,3'] = {
      value: formatTime(matchSeconds),
      color: matchSeconds <= 30 ? 'rose' : 'stone',
      animate: false,
    };
  }

  // Turn timer at top left while the turn clock runs
  if (started && turnMs !== null) {
    const turnSeconds = seconds(turnMs);
    gridItems['-4,-5'] = {
      value: `TURNO:${turnSeconds}S`,
      color: turnSeconds <= 5 ? 'rose' : isMyTurn ? 'amber' : 'stone',
      animate: false,
    };
  }

  // 2. Word Chain Staircase (Up to 10 words, aligned by overlap)
  const words = chain.slice(-10);
  if (words.length > 0) {
    const offsets: number[] = [0];
    for (let i = 1; i < words.length; i++) {
      const prev = words[i - 1].word;
      const curr = words[i].word;
      const overlap = countOverlapStartEnd(prev, curr);
      offsets[i] = offsets[i - 1] + (prev.length - overlap);
    }

    const lastIdx = words.length - 1;
    const latestCenterCol = -Math.floor(words[lastIdx].word.length / 2);
    const baseCol = latestCenterCol - offsets[lastIdx];

    words.forEach((item, i) => {
      const row = -(lastIdx - i);
      const startCol = baseCol + offsets[i];
      const wordText = item.word.toUpperCase();
      const isLatest = i === lastIdx;

      let letterColors: GridColor[] | undefined = undefined;

      if (i > 0) {
        const prev = words[i - 1].word;
        const overlap = countOverlapStartEnd(prev, item.word);
        letterColors = Array.from(wordText).map((_, letterIdx) =>
          letterIdx < overlap ? 'emerald' : isLatest ? 'amber' : 'stone'
        );
      }

      gridItems[`${row},${startCol}`] = {
        value: wordText,
        color: isLatest ? 'amber' : 'stone',
        letterColors,
      };
    });
  }

  // 3. Start countdown, input or turn notification
  if (!started) {
    const message = `COMECA EM ${seconds(startsInMs)}`;
    gridItems[`2,${-Math.floor(message.length / 2)}`] = {
      value: message,
      color: 'amber',
      animate: false,
    };
  } else if (isMyTurn) {
    gridItems['6,-5'] = {
      value: inputWord,
      variant: 'input',
      maxSize: 12,
      fixedFocus: true,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputWord(e.target.value);
      },
      onKeyDown: handleKeyDown,
    };

    // Confirm button at row 4
    gridItems['7,3'] = {
      value: '↵',
      onClick: handleWordSubmit,
      hover: !!inputWord.trim() && canPlay,
      color: 'emerald',
    };

    // Pass turn button
    gridItems['7,-5'] = {
      value: 'PASSAR',
      onClick: handlePass,
      hover: canPlay,
      color: 'rose',
    };
  } else {
    // Other player's turn message
    const turnMessage = `VEZ DE ${turnPlayer?.name?.toUpperCase() || 'OUTRO'}`;
    const startCol = -Math.floor(turnMessage.length / 2);
    gridItems[`2,${startCol}`] = {
      value: turnMessage,
      color: 'stone',
      animate: false,
    };
  }

  return <GridLayout gridItems={gridItems} />;
}
