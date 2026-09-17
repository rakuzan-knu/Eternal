import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../handlers';
import { server } from '../server';

vi.mock('msw/browser', () => ({
  setupWorker: vi.fn().mockImplementation((...handlers) => ({
    start: vi.fn(),
    stop: vi.fn(),
    use: vi.fn(),
    handlers,
  })),
}));

describe('MSW mock setup and handlers', () => {
  it('exports valid handlers and server', () => {
    expect(handlers).toBeDefined();
    expect(handlers.length).toBeGreaterThan(0);
    expect(server).toBeDefined();
  });

  it('exports browser worker', async () => {
    const { worker } = await import('../browser');
    expect(worker).toBeDefined();
  });
});
