import React, { useState, useEffect } from 'react';

export function useContentWidth(ref: React.RefObject<HTMLDivElement>) {
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    function calculateContentWidth() {
      if (ref.current) {
        const children = Array.from(ref.current.children);
        let totalWidth = 0;

        children.forEach(child => {
          const style = window.getComputedStyle(child);
          const marginLeft = parseFloat(style.marginLeft);
          const marginRight = parseFloat(style.marginRight);
          totalWidth += child.clientWidth + marginLeft + marginRight;
        });

        setContentWidth(totalWidth);
      }
    }

    calculateContentWidth();

    window.addEventListener('resize', calculateContentWidth);
    return () => {
      window.removeEventListener('resize', calculateContentWidth);
    };
  }, []);

  return { contentWidth };
}