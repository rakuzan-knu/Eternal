import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from '../useThemeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'dark' });
  });

  it('updates theme correctly', () => {
    expect(useThemeStore.getState().theme).toBe('dark');

    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');

    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });
});
