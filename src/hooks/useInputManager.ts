import React from 'react';

export function useInputManager({
  onChange,
  onSubmit,
}: {
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}): [string, React.Dispatch<React.SetStateAction<string>>] {
  const [value, setValue] = React.useState('');
  const [ctrlDown, setCtrlDown] = React.useState(false);
  const valueRef = React.useRef(value);
  const ctrlDownRef = React.useRef(ctrlDown);

  React.useEffect(() => {
    onChange?.(value);
    valueRef.current = value;
  }, [value]);

  React.useEffect(() => {
    ctrlDownRef.current = ctrlDown;
  }, [ctrlDown]);

  const handleKeyPress = (event: KeyboardEvent) => {
    const { key } = event;

    if (key.length === 1 && key.match(/[a-zA-Z]/)) {
      setValue((prevValue) => {
        const updatedValue = (prevValue += key);
        return updatedValue;
      });
    } else if (key === 'Backspace') {
      setValue((prevValue) => {
        const updatedValue = prevValue.slice(0, -1);
        return updatedValue;
      });
    } else if (key === 'Enter') {
      onSubmit?.(valueRef.current);
    } else if (key === 'Control') {
      setCtrlDown(true);
    }

    if (ctrlDownRef.current && key.match(/[vV]/)) {
      console.log('pasted');
      navigator.clipboard.readText().then((pastedValue) => {
        setValue((prevValue) => {
          const updatedValue = (prevValue += pastedValue);
          return updatedValue;
        });
      });
    }
  };

  const handleKeyRelease = (event: KeyboardEvent) => {
    const { key } = event;

    if (key === 'Control') {
      setCtrlDown(false);
    }
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('keyup', handleKeyRelease);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keyup', handleKeyRelease);
    };
  }, []);

  return [value, setValue];
}
