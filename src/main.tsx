import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { GameProvider } from './state/GameProvider.tsx';
import { ToastManager } from './components/Toast.tsx';

// Dev-only playgrounds for the Pixi engine and motion; stripped from production builds.
const devPages = {
  '/dev/engine': () => import('./dev/EngineDemo.tsx'),
  '/dev/motion': () => import('./dev/MotionPlayground.tsx'),
};
const devPage = import.meta.env.DEV
  ? Object.entries(devPages).find(([path]) => location.pathname.startsWith(path))?.[1]
  : undefined;
const DevPage = devPage ? lazy(devPage) : null;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {DevPage ? (
      <Suspense>
        <DevPage />
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
