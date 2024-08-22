import React, { createContext, useContext, useState, ReactNode } from 'react';

type KeyboardContextType = {
  input: string;
  addKey: (key: string) => void;
  resetInput: () => void;
  setOnSubmit: (callback: () => void) => void;
};

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export const useKeyboard = () => {
  const context = useContext(KeyboardContext);
  if (!context) {
    throw new Error('useKeyboard must be used within a KeyboardProvider');
  }
  return context;
};

type KeyboardProviderProps = {
  children: ReactNode;
};

export const KeyboardProvider: React.FC<KeyboardProviderProps> = ({ children }) => {
  const [input, setInput] = useState<string>('');
  const [onSubmit, setOnSubmit] = useState<(() => void) | null>(null);

  const addKey = (key: string) => {
    if (key === '⟵') {
      setInput((prev) => prev.slice(0, -1));
    } else if (key === '⟶') {
      console.log(key)
      if (onSubmit) onSubmit();
    } else {
      setInput((prev) => prev + key);
    }
  };

  const resetInput = () => {
    setInput('');
  };

  return (
    <KeyboardContext.Provider value={{ input, addKey, resetInput, setOnSubmit }}>
      {children}
    </KeyboardContext.Provider>
  );
};