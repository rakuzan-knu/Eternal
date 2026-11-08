import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCookieConsentStore } from '@/features/cookies/model/useCookieConsentStore';

const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({
  render: mockRender,
  unmount: vi.fn(),
}));

vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}));

const mockSyncSentryConsent = vi.fn();
vi.mock('@/shared/config/sentry', () => ({
  syncSentryConsent: mockSyncSentryConsent,
}));

const mockInitCrossTabSync = vi.fn();
vi.mock('@/shared/lib/broadcastSync', () => ({
  initCrossTabSync: mockInitCrossTabSync,
}));

vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/app/App', () => ({
  default: () => <div data-testid="app-root">App Mock</div>,
}));

describe('main application bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCookieConsentStore.setState({
      hasConsented: false,
      preferences: { ...useCookieConsentStore.getState().preferences, analytics: false },
    });
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('synchronizes Sentry consent, initializes cross-tab sync, and renders app into #root', async () => {
    await import('../main');

    expect(mockSyncSentryConsent).toHaveBeenLastCalledWith(false);
    expect(mockInitCrossTabSync).toHaveBeenCalled();
    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(mockRender).toHaveBeenCalled();
    useCookieConsentStore.setState({
      hasConsented: true,
      preferences: { ...useCookieConsentStore.getState().preferences, analytics: true },
    });
    expect(mockSyncSentryConsent).toHaveBeenLastCalledWith(true);
    useCookieConsentStore.setState({ hasConsented: false });
    expect(mockSyncSentryConsent).toHaveBeenLastCalledWith(false);
  }, 15000);
});
