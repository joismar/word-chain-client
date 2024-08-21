import React from 'react';

export function useScrollToBottom(ref: React.RefObject<HTMLElement>) {
  const scrollToBottom = () => {
    if (ref.current) {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  return { scrollToBottom };
}
