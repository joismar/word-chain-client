import React from 'react';

export function useOnPressKey(key: string, callback?: () => void) {
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === key) {
      callback?.();
    }
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);
}
