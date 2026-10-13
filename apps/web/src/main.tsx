import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Sentry from '@sentry/react';
import { MotionConfig } from 'framer-motion';

import './index.css';
import App from '@/app/App';
import { initSentry } from '@/shared/config/sentry';
import { ErrorFallback } from '@/shared/ui/ErrorFallback';
import { queryClient, offlinePersistOptions } from '@/shared/api/queryClient';
import { initCrossTabSync } from '@/shared/lib/broadcastSync';
import { ensureDevAccounts } from '@/shared/lib/devAccounts';
import { initializeVisualEffects } from '@/shared/model/useVisualEffects';

initSentry();
initCrossTabSync();
void ensureDevAccounts();
const disposeVisualEffects = initializeVisualEffects();
if (import.meta.hot) import.meta.hot.dispose(disposeVisualEffects);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, componentStack, resetError }) => (
        <ErrorFallback error={error} componentStack={componentStack} resetError={resetError} />
      )}
    >
      <BrowserRouter>
        <PersistQueryClientProvider client={queryClient} persistOptions={offlinePersistOptions}>
          <MotionConfig reducedMotion="user">
            <App />
          </MotionConfig>
        </PersistQueryClientProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
