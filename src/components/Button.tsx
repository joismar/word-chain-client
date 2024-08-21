import { Distance } from '@src/utils/types';

type ButtonProps = React.PropsWithChildren<{
  distance: Distance;
  className?: React.HTMLAttributes<HTMLDivElement>['className'];
}> &
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export function Button({
  children,
  distance = 1,
  className,
  ...divProps
}: ButtonProps) {
  const distanceClasses = (() => {
    switch (distance) {
      case 0:
        return 'h-0 text-[0rem]';
      case 1:
        return 'h-12 text-[2rem]';
      case 2:
        return 'h-9 text-[1.5rem]';
      case 3:
        return 'h-6 text-[1rem]';
    }
  })();

  return (
    <div
      className={`${distanceClasses} px-2 bg-neutral-950 flex-none flex justify-center items-center font-bold rounded-[.2rem] transition-all ${
        className || ''
      }`}
      {...divProps}
    >
      {children}
    </div>
  );
}
