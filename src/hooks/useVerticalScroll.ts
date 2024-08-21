import React from 'react';

export function useVerticalScroll(
  ref: React.RefObject<HTMLDivElement>,
  bottomOffset = 1
) {
  const [isScrollActive, setIsScrollActive] = React.useState(false);
  const [isBottomScrolled, setIsBottomScrolled] = React.useState(false);
  const [isTopScrolled, setIsTopScrolled] = React.useState(false);
  const container = ref.current;

  const updateScrollState = () => {
    if (!container) return;

    setIsTopScrolled(container.scrollTop > 0);
    setIsBottomScrolled(
      container.scrollTop + bottomOffset + container.clientHeight <
        container.scrollHeight
    );
    setIsScrollActive(container.scrollHeight > container.clientHeight);
  };

  React.useEffect(() => {
    if (!container) return;

    const handleScroll = () => {
      updateScrollState();
    };

    if (container.scrollHeight > container.clientHeight) {
      updateScrollState();
      container.addEventListener('scroll', handleScroll);
    }

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [container?.scrollHeight, container?.clientHeight]);

  return { isScrollActive, isTopScrolled, isBottomScrolled };
}
