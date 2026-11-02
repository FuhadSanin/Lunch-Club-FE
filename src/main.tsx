import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App';
import { StoreProvider } from './store';
import { CelebrationProvider } from './components/celebrate';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/sonner';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <TooltipProvider delayDuration={300}>
          <CelebrationProvider>
            <App />
            <Toaster position="bottom-center" />
          </CelebrationProvider>
        </TooltipProvider>
      </StoreProvider>
    </MotionConfig>
  </StrictMode>,
);
