import React from 'react';
import { Letter } from './Letter';
import { Distance } from '@src/utils/types';

type WordProps = {
  children: string;
  distance?: Distance;
  chainConfig?: {
    first: number;
    last: number;
  };
  blink?: boolean;
  ref?: React.RefObject<HTMLDivElement>;
  collapseSize?: number;
  letterClassName?: React.HTMLAttributes<HTMLDivElement>['className'];
  wrap?: boolean;
  autoSize?: boolean;
} & React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

export function Word({
  children,
  distance = 1,
  chainConfig,
  blink,
  ref,
  collapseSize = 0,
  letterClassName,
  className,
  wrap,
  autoSize,
  ...divProps
}: WordProps) {
  const [letterDistance, setLetterDistance] = React.useState<Distance>(0);

  React.useEffect(() => {
    setTimeout(() => {
      setLetterDistance(distance);
    }, 500);
  }, [distance]);

  const distanceClasses = (() => {
    if (autoSize) return 'space-x-1';
    switch (distance) {
      case 0:
        return 'gap-0';
      case 1:
        return 'gap-2';
      case 2:
        return 'gap-1.5';
      case 3:
        return 'gap-1';
    }
  })();

  const blinkClasses = (() => {
    switch (distance) {
      case 0:
        return 'w-0 h-0';
      case 1:
        return 'w-2 h-12';
      case 2:
        return 'w-1.5 h-9';
      case 3:
        return 'w-1 h-6';
    }
  })();

  function chained(i: number) {
    if (!chainConfig) return undefined;
    if (i < chainConfig.first) return 'left';
    if (children.length - 1 - i < chainConfig.last) return 'right';
  }

  const wrapClass = wrap ? 'w-[100%] flex-wrap' : '';

  const gridClasses = autoSize
    ? 'flex justify-center w-full'
    : 'flex items-end';

  return (
    <div
      className={`${gridClasses} ${wrapClass} ${distanceClasses} ${
        className || ''
      } transition-[gap] duration-[.5s]`}
      ref={ref}
      // style={{
      //   display: 'grid',
      //   gridColumn: 10,
      //   width: '100%',
      //   gridTemplateColumns: 'repeat(10, minmax(0, 1fr))'
      // }}
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
            className={letterClassName}
            autoSize={autoSize}
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
