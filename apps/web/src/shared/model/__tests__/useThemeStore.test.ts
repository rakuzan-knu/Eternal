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

  it('correctly updates data-theme and contrast when switching from light theme to gradient preset', () => {
    // 1. Switch to light solid theme
    useThemeStore.getState().setSolidTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-surface-contrast')).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // 2. Switch to Sunset Mirage gradient (dark warm tone)
    useThemeStore.getState().setGradientPreset('sunset-mirage');
    expect(useThemeStore.getState().themeMode).toBe('gradient');
    expect(useThemeStore.getState().gradientPresetId).toBe('sunset-mirage');

    // Crucial check: data-theme MUST be 'dark', NOT remain 'light'!
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-surface-contrast')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(useThemeStore.getState().solidTheme).toBe('dark');

    // 3. Switch back to light
    useThemeStore.getState().setSolidTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-surface-contrast')).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // 4. Switch to Ash base theme
    useThemeStore.getState().setSolidTheme('ash');
    expect(document.documentElement.getAttribute('data-theme')).toBe('ash');
    expect(document.documentElement.getAttribute('data-surface-contrast')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);

    // 5. Reset to defaults (fresh account state)
    useThemeStore.getState().resetToDefaults();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-surface-contrast')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });
});
