import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GameBlocProvider } from './providers/GameBlocProvider.tsx';
import { KeyboardProvider } from './providers/KeyboardProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameBlocProvider>
      <KeyboardProvider>
        <App />
      </KeyboardProvider>
    </GameBlocProvider>
  </StrictMode>
);
