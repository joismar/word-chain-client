import { createContext, useContext, ReactNode } from 'react';
import { useGameBloc } from '@src/hooks/useGameBloc';

const GameBlocContext = createContext<
  ReturnType<typeof useGameBloc> | undefined
>(undefined);

export const GameBlocProvider = ({ children }: { children: ReactNode }) => {
  const gameBloc = useGameBloc();

  return (
    <GameBlocContext.Provider value={gameBloc}>
      {children}
    </GameBlocContext.Provider>
  );
};

export const useGameBlocContext = () => {
  const context = useContext(GameBlocContext);
  if (context === undefined) {
    throw new Error(
      'useGameBlocContext must be used within a GameBlocProvider'
    );
  }
  return context;
};
