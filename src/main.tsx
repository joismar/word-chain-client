import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GameProvider } from './state/GameProvider.tsx';
import { ToastManager } from './components/Toast.tsx';

// Dev-only playground for the Pixi engine; stripped from production builds.
const EngineDemo = import.meta.env.DEV && location.pathname.startsWith('/dev/engine')
  ? lazy(() => import('./dev/EngineDemo.tsx'))
  : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {EngineDemo ? (
      <Suspense>
        <EngineDemo />
      </Suspense>
    ) : (
      <>
        <GameProvider>
          <App />
        </GameProvider>
        <ToastManager />
      </>
    )}
  </StrictMode>
);
