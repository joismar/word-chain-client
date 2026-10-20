import React from 'react';
import { Action } from '@shared/enums';
import { GridColor, GridItems, GridLayout } from '@src/components/GridLayout';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import { countOverlapStartEnd } from '@src/utils/helpers';

export function GameGrid() {
  const {
    gameData,
    sendEvent,
    isMyTurn,
    findTurnPlayer,
    isHost,
  } = useGameBlocContext();

  const [inputWord, setInputWord] = React.useState('');
  const [turnSeconds, setTurnSeconds] = React.useState(15);
  const [matchSeconds, setMatchSeconds] = React.useState(
    (gameData.config?.time || 3) * 6000
  );

  const chain = gameData.chain || [];

  // Match countdown timer
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMatchSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (isHost()) {
            sendEvent({ action: Action.END, data: [] });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isHost, sendEvent]);

  // Turn timer (15 seconds)
  React.useEffect(() => {
    setTurnSeconds(15);
    if (!isMyTurn() || (gameData.players?.length || 0) <= 1) return;

    const interval = setInterval(() => {
      setTurnSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          sendEvent({ action: Action.PASS, data: [] });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameData.turn, chain.length, isMyTurn, gameData.players?.length, sendEvent]);

  function handleWordSubmit() {
    if (!inputWord.trim() || !isMyTurn()) return;
    sendEvent({
      action: Action.WORD,
      data: [inputWord.trim().toLowerCase()],
    });
    setInputWord('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleWordSubmit();
    }
  }

  function handlePass() {
    if (!isMyTurn()) return;
    sendEvent({
      action: Action.PASS,
      data: [],
    });
  }

  // Format timer MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeTurnPlayer = findTurnPlayer();
  const myTurn = isMyTurn();

  const gridItems: GridItems = {};

  // 1. Top Bar: Timers
  // Match timer at top right
  gridItems['-5,3'] = {
    value: formatTime(matchSeconds),
    color: matchSeconds <= 30 ? 'rose' : 'stone',
    animate: false,
  };

  // Turn timer at top left when active
  if (myTurn && (gameData.players?.length || 0) > 1) {
    gridItems['-4,-5'] = {
      value: `TURNO:${turnSeconds}S`,
      color: turnSeconds <= 5 ? 'rose' : 'amber',
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

  // 4. Input or Turn Notification (Row +2)
  if (myTurn) {
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
      hover: !!inputWord.trim(),
      color: 'emerald',
    };

    // Pass turn button
    gridItems['7,-5'] = {
      value: 'PASSAR',
      onClick: handlePass,
      hover: true,
      color: 'rose',
    };
  } else {
    // Other player's turn message
    const turnMessage = `VEZ DE ${activeTurnPlayer?.name?.toUpperCase() || 'OUTRO'}`;
    const startCol = -Math.floor(turnMessage.length / 2);
    gridItems[`2,${startCol}`] = {
      value: turnMessage,
      color: 'stone',
      animate: false,
    };
  }

  return <GridLayout gridItems={gridItems} />;
}
