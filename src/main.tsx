import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GameBlocProvider } from './providers/GameBlocProvider.tsx';
import { ToastManager } from './components/Toast.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameBlocProvider>
      <App />
    </GameBlocProvider>
    <ToastManager />
  </StrictMode>
);
