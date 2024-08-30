import React from 'react';
import { Letter } from './Letter';
import { Distance } from '@src/utils/types';

export type WordProps = {
  children: string;
  distance?: Distance;
  chainConfig?: {
    first: number;
    last: number;
  };
  blink?: boolean;
  collapseSize?: number;
  letterClassName?: React.HTMLAttributes<HTMLDivElement>['className'];
  wrap?: boolean;
  autoSize?: boolean;
  getLetterSize?: (size: number) => void; 
  containerSize?: number;
} & React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

export function Word({
  children,
  distance = 1,
  chainConfig,
  blink,
  collapseSize = 0,
  letterClassName,
  className,
  wrap,
  getLetterSize,
  ...divProps
}: WordProps) {
  // const isMobile = useIsMobile();
  // const distance = isMobile ? distanceProp + 1 : distanceProp;
  const [letterDistance, setLetterDistance] = React.useState<Distance>(0);

  React.useEffect(() => {
    setTimeout(() => {
      setLetterDistance(distance as Distance);
    }, 500);
  }, [distance]);

  const distanceClasses = (() => {
    switch (distance) {
      case 0:
        return 'gap-0';
      case 1:
        return 'gap-2';
      case 2:
        return 'gap-1.5';
      case 3:
        return 'gap-1';
      case 4:
        return 'gap-[.125rem]';
    }
  })();

  const blinkClasses = (() => {
    switch (distance) {
      case 0:
        return 'w-0 h-0';
      case 1:
        return 'w-2 h-10';
      case 2:
        return 'w-1.5 h-8';
      case 3:
        return 'w-1 h-6';
      case 4:
        return 'w-.5 h-4';
    }
  })();

  function chained(i: number) {
    if (!chainConfig) return undefined;
    if (i < chainConfig.first && children.length - 1 - i < chainConfig.last) return 'center';
    if (i < chainConfig.first) return 'left';
    if (children.length - 1 - i < chainConfig.last) return 'right';
  }

  const wrapClass = wrap ? 'w-[100%] flex-wrap' : '';
  const gridClasses = 'flex items-end';
  const colorClasses = (i: number) => {
    if (chained(i) === 'center') return 'bg-amber-800'
    if (chained(i) === 'left') return 'bg-red-800';
    if (chained(i) === 'right') return 'bg-yellow-800';
    return 'bg-neutral-950';
  };

  return (
    <div
      className={`${gridClasses} ${wrapClass} ${distanceClasses} ${
        className || ''
      } transition-[gap] duration-[.5s]`}
      {...divProps}
    >
      {collapseSize > 0 && <Letter distance={letterDistance}>...</Letter>}
      {children
        .split('')
        .slice(collapseSize)
        .map((letter, i) => (
          <Letter
            distance={letterDistance}
            chained={chained(i + collapseSize)}
            key={i}
            className={`${letterClassName} ${colorClasses(i)}`}
            {...(i === 0 && { getLetterSize })}
          >
            {letter}
          </Letter>
        ))}
      {blink && (
        <div
          className={`flex-none bg-white animate-blink ${blinkClasses}`}
        ></div>
      )}
    </div>
  );
}
