import { useClientSize } from '@src/hooks/useClientSize';
import { Distance } from '@src/utils/types';
import React from 'react';

type LetterProps = {
  children: string;
  distance: Distance;
  chained?: 'left' | 'right' | 'center';
  transparent?: boolean;
  className?: React.HTMLAttributes<HTMLDivElement>['className'];
  getLetterSize?: (size: number) => void; 
} & React.DetailedHTMLProps<
React.HTMLAttributes<HTMLDivElement>,
HTMLDivElement
>;

export function Letter({
  children,
  distance,
  chained,
  transparent,
  className,
  getLetterSize,
  ...divProps
}: LetterProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { clientWidth } = useClientSize(ref);

  React.useEffect(() => {
    getLetterSize?.(clientWidth);
  }, [clientWidth])

  const distanceClasses = (() => {
    switch (distance) {
      case 0:
        return 'w-0 h-0 text-[0rem]';
      case 1:
        return 'w-10 h-10 text-[1.2rem]';
      case 2:
        return 'w-8 h-8 text-[1rem]';
      case 3:
        return 'w-6 h-6 text-[0.8rem]';
      case 4:
        return 'w-4 h-4 text-[0.6rem]';
    }
  })();

  const colorClasses = (() => {
    if (!children.length || children == ' ' || transparent)
      return '!bg-transparent';
    if (chained === 'center') return 'bg-amber-800'
    if (chained === 'left') return 'bg-red-800';
    if (chained === 'right') return 'bg-yellow-800';
    return 'bg-neutral-950';
  })();

  const sizeClasses = 'flex-none flex justify-center items-center'

  return (
    <div
      className={`${distanceClasses} ${colorClasses} ${sizeClasses} font-semibold transition-all duration-[.5s] rounded-[10%] ${
        className || ''
      }`}
      ref={ref}
      {...divProps}
    >
      {children.toUpperCase()}
    </div>
  );
}
