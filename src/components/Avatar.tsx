import React from 'react';
import { Distance } from '../utils/types';

type AvatarProps = {
  distance: Distance;
  points?: number;
  ref?: React.RefObject<HTMLDivElement>;
} & React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;

export function Avatar({
  distance = 1,
  points,
  ref,
  className,
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
        return 'w-12 h-12';
      case 2:
        return 'w-9 h-9';
      case 3:
        return 'w-6 h-6';
    }
  })();

  const chipClasses = avatarDistance === 0 ? 'opacity-0' : 'opacity-100';

  const colors = [
    'bg-pink-300',
    'bg-blue-300',
    'bg-green-300',
    'bg-yellow-300',
    'bg-cyan-300',
    'bg-purple-300',
  ];

  const randomColorPicker = React.useMemo(
    () => colors[Math.floor(Math.random() * colors.length)],
    []
  );

  return (
    <div
      className={`inline-block ${distanceClasses} transition-all duration-[.5s] ${
        className || ''
      }`}
      ref={ref}
      {...divProps}
    >
      <div className={`w-full h-full rounded-full ${randomColorPicker}`} />
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
