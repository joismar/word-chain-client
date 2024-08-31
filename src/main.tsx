import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GameBlocProvider } from './providers/GameBlocProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameBlocProvider>
      <App />
    </GameBlocProvider>
  </StrictMode>
);
