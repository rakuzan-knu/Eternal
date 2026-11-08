import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Sentry from '@sentry/react';
import { AppMotion } from '@/shared/ui/AppMotion';

import './index.css';
import App from '@/app/App';
import { syncSentryConsent } from '@/shared/config/sentry';
import { useCookieConsentStore } from '@/features/cookies/model/useCookieConsentStore';
import { ErrorFallback } from '@/shared/ui/ErrorFallback';
import { queryClient, offlinePersistOptions } from '@/shared/api/queryClient';
import { initCrossTabSync } from '@/shared/lib/broadcastSync';
import { ensureDevAccounts } from '@/shared/lib/devAccounts';
import { initializeVisualEffects } from '@/shared/model/useVisualEffects';

const syncAnalytics = ({
  hasConsented,
  preferences,
}: ReturnType<typeof useCookieConsentStore.getState>) =>
  syncSentryConsent(hasConsented === true && preferences.analytics === true);
syncAnalytics(useCookieConsentStore.getState());
const unsubscribeAnalytics = useCookieConsentStore.subscribe(syncAnalytics);
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribeAnalytics();
    syncSentryConsent(false);
  });
}
initCrossTabSync();
if (import.meta.env.DEV && import.meta.env.VITE_SEED_DEV_ACCOUNTS === 'true') {
  void ensureDevAccounts();
}
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
          <AppMotion>
            <App />
          </AppMotion>
        </PersistQueryClientProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
