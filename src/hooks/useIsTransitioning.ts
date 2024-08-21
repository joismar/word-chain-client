import React from 'react';

export function useIsTransitioning() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTransitionStart = () => {
      setIsTransitioning(true);
    };

    const handleTransitionEnd = () => {
      setIsTransitioning(false);
    };

    element.addEventListener('transitionstart', handleTransitionStart);
    element.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      element.removeEventListener('transitionstart', handleTransitionStart);
      element.removeEventListener('transitionend', handleTransitionEnd);
    };
  }, [ref.current]);

  return { ref, isTransitioning };
}
