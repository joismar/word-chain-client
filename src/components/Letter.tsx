import { Distance } from '@src/utils/types';

type LetterProps = {
  children: string;
  distance: Distance;
  chained?: 'left' | 'right';
  transparent?: boolean;
  className?: React.HTMLAttributes<HTMLDivElement>['className'];
};

export function Letter({
  children,
  distance = 1,
  chained,
  transparent,
  className,
}: LetterProps) {
  const distanceClasses = (() => {
    switch (distance) {
      case 0:
        return 'w-0 h-0 text-[0rem]';
      case 1:
        return 'w-12 h-12 text-[2rem]';
      case 2:
        return 'w-9 h-9 text-[1.5rem]';
      case 3:
        return 'w-6 h-6 text-[1rem]';
    }
  })();

  const colorClasses = (() => {
    if (!children.length || children == ' ' || transparent)
      return '!bg-transparent';
    if (chained === 'left') return 'bg-orange-800';
    if (chained === 'right') return 'bg-yellow-800';
    return 'bg-neutral-950';
  })();

  return (
    <div
      className={`${distanceClasses} ${colorClasses} flex-none flex justify-center items-center font-bold transition-all duration-[.5s] rounded-[10%] ${
        className || ''
      }`}
    >
      {children.toUpperCase()}
    </div>
  );
}
