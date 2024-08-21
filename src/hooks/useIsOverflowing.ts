import React from 'react';

export function useIsOverflowing(
  ref: React.RefObject<HTMLDivElement>,
  depArray: any[],
  maxHeight?: number,
  maxWidth?: number
) {
  const [isOverflowingH, setIsOverflowingH] = React.useState(false);
  const [isOverflowingW, setIsOverflowingW] = React.useState(false);
  const [clientWidth, setClientWidth] = React.useState(0);
  const [clientHeight, setClientHeight] = React.useState(0);

  React.useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      setClientWidth(container.clientWidth);
      setClientHeight(container.clientHeight);
      maxHeight && setIsOverflowingH(maxHeight > container.clientHeight);
      maxWidth && setIsOverflowingW(maxWidth > container.clientWidth);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, depArray);

  return {
    isOverflowingH,
    isOverflowingW,
    clientHeight,
    clientWidth,
  };
}
