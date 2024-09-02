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
  return (
    <div
      className={`px-4 py-2 bg-neutral-900 flex-none flex justify-center items-center font-bold rounded transition-all ${
        className || ''
      }`}
      {...divProps}
    >
      {children}
    </div>
  );
}
