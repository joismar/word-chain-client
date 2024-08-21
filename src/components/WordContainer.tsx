import React from 'react';
import { Avatar } from './Avatar';
import { Word } from './Word';
import { useEventSystem } from '../hooks/useEventSystem';
import { Distance, InGameWord } from '../utils/types';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';

export function WordContainer({
  isLastIndex,
  containerWidth = 0,
  word,
  onDestroy,
  showAvatar,
}: {
  isLastIndex: boolean;
  word: InGameWord;
  containerWidth?: number;
  onDestroy?: () => void;
  showAvatar?: boolean;
}) {
  const { findPlayerById } = useGameBlocContext();
  const [lastMargin, setLastMargin] = React.useState('mt-[-.5rem]');
  const [distance, setDistance] = React.useState<Distance>();
  const ref = React.useRef<HTMLDivElement>(null);
  const wordWidth =
    (isLastIndex ? 36 : 28) * word.word.length - (isLastIndex ? 6 : 4) + 92;
  const collapseSize =
    Math.round((wordWidth - containerWidth) / (isLastIndex ? 36 : 28)) + 2;

  const { subscribe } = useEventSystem();

  React.useEffect(() => {
    const unsubscribe = subscribe('destroyWords', (data) => {
      if (data.includes(word.word)) {
        setDistance(0);
        setLastMargin('mt-[-.5rem]');
        setTimeout(() => {
          onDestroy?.();
        }, 1000);
      }
    });

    return () => unsubscribe();
  }, [subscribe]);

  React.useEffect(() => {
    setLastMargin('');
  }, []);

  const wordPlayer = findPlayerById(word.player_id);

  return (
    <div
      className={`relative ${lastMargin} flex flex-row gap-2 transition-[margin] duration-[.5s] delay-[.5s]`}
      ref={ref}
    >
      {showAvatar && (
        <Avatar
          distance={distance != undefined ? distance : isLastIndex ? 2 : 3}
          points={wordPlayer?.score}
          className={`absolute ${
            isLastIndex ? 'left-[-3rem]' : 'left-[-2.2rem]'
          }`}
        />
      )}
      <Word
        distance={distance != undefined ? distance : isLastIndex ? 2 : 3}
        chainConfig={{ first: word.first, last: word.last }}
        className={`${
          isLastIndex ? 'opacity-100' : 'opacity-50'
        } transition-all duration-[.5s] delay-[.5s]`}
        key={word.word}
        collapseSize={collapseSize > 0 ? collapseSize : 0}
      >
        {word.word}
      </Word>
    </div>
  );
}
