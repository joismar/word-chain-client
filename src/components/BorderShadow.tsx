export function BorderShadow({
  className,
  direction,
  isVisible,
}: {
  size?: string;
  direction: 't' | 'r' | 'l' | 'b';
  className?: string;
  isVisible?: boolean;
}) {
  const directionClasses = (() => {
    switch (direction) {
      case 't':
        return `h-[3rem] mt-[-3rem] bg-gradient-to-t`;
      case 'r':
        return `w-[3rem] mr-[-3rem] bg-gradient-to-r`;
      case 'l':
        return `w-[3rem] ml-[-3rem] bg-gradient-to-l`;
      case 'b':
        return `h-[3rem] mb-[-3rem] bg-gradient-to-b`;
      default:
        return '';
    }
  })();

  const visibleClass = !isVisible ? 'opacity-0' : 'opacity-100';

  return (
    <div
      className={`${directionClasses} from-neutral-800 to-transparent pointer-events-none ${className} ${visibleClass}`}
    ></div>
  );
}
