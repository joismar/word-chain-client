import React from 'react';
import { Distance } from '../utils/types';

type AvatarProps = {
  distance: Distance;
  points?: number;
  ref?: React.RefObject<HTMLDivElement>;
  color?: string;
} & React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

export function Avatar({
  distance = 1,
  points,
  ref,
  className,
  color,
  ...divProps
}: AvatarProps) {
  const [avatarDistance, setAvatarDistance] = React.useState<Distance>(0);

  React.useEffect(() => {
    setTimeout(() => {
      setAvatarDistance(distance);
    }, 500);
  }, [distance]);

  const distanceClasses = (() => {
    switch (avatarDistance) {
      case 0:
        return 'w-0 h-0';
      case 1:
        return 'w-10 h-10';
      case 2:
        return 'w-8 h-8';
      case 3:
        return 'w-6 h-6';
      case 4:
        return 'w-2 h-2';
    }
  })();

  const chipClasses = avatarDistance === 0 ? 'opacity-0' : 'opacity-100';

  return (
    <div
      className={`inline-block ${distanceClasses} transition-all duration-[.5s] ${
        className || ''
      }`}
      ref={ref}
      {...divProps}
    >
      <div className={`w-full h-full rounded-full ${color || 'bg-neutral-300'}`} />
      {points ? (
        <span
          className={`absolute top-0 left-0 transform -translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-xs font-bold px-1 rounded-full ${chipClasses} transition-opacity duration-[.5s]`}
        >
          {points}
        </span>
      ) : null}
    </div>
  );
}
