import React from 'react';

export function useClientSize(
  refProp?: React.RefObject<HTMLDivElement>,
  depArray?: any[],
) {
  const ref = refProp || React.useRef<HTMLDivElement>(null);
  const [clientWidth, setClientWidth] = React.useState(0);
  const [clientHeight, setClientHeight] = React.useState(0);
  const [scrolltWidth, setScrollWidth] = React.useState(0);
  const [scrolltHeight, setScrollHeight] = React.useState(0);

  React.useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      setClientWidth(container.clientWidth);
      setClientHeight(container.clientHeight);
      setScrollWidth(container.scrollWidth);
      setScrollHeight(container.scrollHeight);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, depArray);

  return {
    ref,
    clientHeight,
    clientWidth,
    scrolltHeight,
    scrolltWidth,
  };
}
