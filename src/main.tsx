import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GameProvider } from './state/GameProvider.tsx';
import { ToastManager } from './components/Toast.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider>
      <App />
    </GameProvider>
    <ToastManager />
  </StrictMode>
);
