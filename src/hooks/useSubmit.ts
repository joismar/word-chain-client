import React from 'react';

export function useSubmit(onSubmit?: () => void) {
  const handleKeyPress = (event: KeyboardEvent) => {
    const { key } = event;

    if (key === 'Enter') {
      onSubmit?.();
    }
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);
}
