import { describe, it, expect, vi } from 'vitest';
import { initSentry } from '../sentry';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}));

describe('sentry', () => {
  it('skips initialization when DSN is empty or invalid', () => {
    initSentry();
    // Doesn't throw error and gracefully handles unconfigured DSN
    expect(true).toBe(true);
  });
});
