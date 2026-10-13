import { describe, it, expect } from 'vitest';
import { queryClient } from '../queryClient';

describe('queryClient', () => {
  it('initializes with expected default query options', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.retry).toBeTypeOf('function');
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('retries a transient query failure once', () => {
    const retry = queryClient.getDefaultOptions().queries?.retry;
    if (typeof retry !== 'function') throw new Error('Expected a query retry policy');
    for (const error of [
      new Error('Network unavailable'),
      Object.assign(new Error('Server error'), { response: { status: 503 } }),
    ]) {
      expect(retry(0, error)).toBe(true);
      expect(retry(1, error)).toBe(false);
    }
  });

  it.each([401, 403, 404, 429])('does not retry HTTP %s client errors', (status) => {
    const retry = queryClient.getDefaultOptions().queries?.retry;
    if (typeof retry !== 'function') throw new Error('Expected a query retry policy');
    expect(retry(0, Object.assign(new Error('Client error'), { response: { status } }))).toBe(
      false,
    );
    expect(retry(0, Object.assign(new Error('Client error'), { status }))).toBe(false);
  });
});
