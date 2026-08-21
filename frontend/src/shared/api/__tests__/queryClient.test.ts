import { describe, it, expect } from 'vitest';
import { queryClient } from '../queryClient';

describe('queryClient', () => {
  it('initializes with expected default query options', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.retry).toBe(1);
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
  });
});
