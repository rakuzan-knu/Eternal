import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({
  render: mockRender,
  unmount: vi.fn(),
}));

vi.mock('react-dom/client', () => ({
  createRoot: mockCreateRoot,
}));

const mockInitSentry = vi.fn();
vi.mock('@/shared/config/sentry', () => ({
  initSentry: mockInitSentry,
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
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('initializes Sentry, cross-tab sync, and renders app into #root', async () => {
    await import('../main');

    expect(mockInitSentry).toHaveBeenCalled();
    expect(mockInitCrossTabSync).toHaveBeenCalled();
    expect(mockCreateRoot).toHaveBeenCalledWith(document.getElementById('root'));
    expect(mockRender).toHaveBeenCalled();
  }, 15000);
});
