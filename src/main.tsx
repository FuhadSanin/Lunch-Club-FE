import { StrictMode, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './api/queries';
import App from './App';
import Privacy from './legal/Privacy';
import Terms from './legal/Terms';
import { StoreProvider } from './store';
import { CelebrationProvider } from './components/celebrate';
import { ErrorBoundary } from './components/error-boundary';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/sonner';
import './index.css';

// The plain-words pages (/privacy, /terms) stand on their own, outside the app.
const LEGAL: Record<string, ReactElement> = { '/privacy': <Privacy />, '/terms': <Terms /> };

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <TooltipProvider delayDuration={300}>
          <CelebrationProvider>
            <ErrorBoundary>
              {LEGAL[window.location.pathname.replace(/\/$/, '')] ?? <App />}
            </ErrorBoundary>
            <Toaster position="bottom-center" />
          </CelebrationProvider>
        </TooltipProvider>
      </StoreProvider>
    </MotionConfig>
    {/* The query inspector floats over the page's own buttons; add ?devtools to the address to open it while developing. */}
    {import.meta.env.DEV && new URLSearchParams(window.location.search).has('devtools') && <ReactQueryDevtools buttonPosition="bottom-right" />}
    </QueryClientProvider>
  </StrictMode>,
);
