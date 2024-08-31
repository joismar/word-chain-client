import React from 'react';
import { Avatar } from './Avatar';
import { Word } from './Word';
import { useEventSystem } from '../hooks/useEventSystem';
import { Distance, InGameWord } from '../utils/types';
import { useGameBlocContext } from '@src/providers/GameBlocProvider';
import useIsMobile from '@src/hooks/useIsMobile';
import { useClientSize } from '@src/hooks/useClientSize';
import { getCSSPlayerColor } from '@src/utils/helpers';
import { PlayerColor } from '@shared/enums';

export function WordContainer({
  hasScore,
  word,
  onDestroy,
}: {
  word: InGameWord;
  onDestroy?: () => void;
  hasScore?: boolean;
}) {
  const { findPlayerById } = useGameBlocContext();
  const [lastMargin, setLastMargin] = React.useState('mt-[-.5rem]');
  const [distance, setDistance] = React.useState<Distance>();
  const ref = React.useRef<HTMLDivElement>(null);
  const { clientWidth } = useClientSize(ref);
  const [letterSize, setLetterSize] = React.useState(0);
  const wordWidth = (letterSize + 1) * word.word.length;
  const collapseSize =
    Math.round((wordWidth - clientWidth) / letterSize) + 3;

  const isMobile = useIsMobile();

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
  const wordDistanceSum = useIsMobile() ? 1 : 0
  const calculatedDistance = ((hasScore ? 2 : 3) + wordDistanceSum) as Distance

  return (
    <div
      className={`relative ${lastMargin} flex flex-row transition-[margin] duration-[.5s] delay-[.5s] w-[100%]`}
      ref={ref}
    >
      {hasScore && (
        <Avatar
          distance={distance != undefined ? distance : calculatedDistance}
          points={wordPlayer?.score}
          className={`absolute ${
            isMobile ? 'left-[-1.8rem]' : 'left-[-2.4rem]'
          }`}
          color={getCSSPlayerColor(wordPlayer?.color || PlayerColor.BLUE)}
        />
      )}
      <Word
        distance={distance != undefined ? distance : calculatedDistance}
        chainConfig={{ first: word.first, last: word.last }}
        className={`${
          hasScore ? 'opacity-100' : 'opacity-50'
        } transition-all duration-[.5s] delay-[.5s]`}
        key={word.word}
        getLetterSize={(size) => setLetterSize(size)}
        collapseSize={collapseSize > 0 ? collapseSize : 0}
      >
        {word.word}
      </Word>
    </div>
  );
}
