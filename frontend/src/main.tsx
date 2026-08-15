import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';

import './index.css';
import App from '@/app/App';
import { initSentry } from '@/shared/config/sentry';
import { ErrorFallback } from '@/shared/ui/ErrorFallback';
import { queryClient } from '@/shared/api/queryClient';
import { initCrossTabSync } from '@/shared/lib/broadcastSync';

initSentry();
initCrossTabSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, componentStack, resetError }) => (
        <ErrorFallback error={error} componentStack={componentStack} resetError={resetError} />
      )}
    >
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
