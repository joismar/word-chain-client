import React, { useState, useEffect } from 'react';

export function useContentHeight(ref: React.RefObject<HTMLDivElement>, deps: any[]) {
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    function calculateContentHeight() {
      if (ref.current) {
        const children = Array.from(ref.current.children);
        let totalHeight = 0;

        children.forEach(child => {
          const style = window.getComputedStyle(child);
          const marginTop = parseFloat(style.marginTop);
          const marginBottom = parseFloat(style.marginBottom);
          totalHeight += child.clientHeight + marginTop + marginBottom;
        });

        setContentHeight(totalHeight);
      }
    }

    calculateContentHeight();

    window.addEventListener('resize', calculateContentHeight);
    return () => {
      window.removeEventListener('resize', calculateContentHeight);
    };
  }, deps);

  return { contentHeight };
}