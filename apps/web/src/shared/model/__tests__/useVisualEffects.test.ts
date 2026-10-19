import { afterEach, describe, expect, it, vi } from 'vitest';
import { initializeVisualEffects, useVisualEffects, shouldReduceMotion } from '../useVisualEffects';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.removeItem('eternal-visual-effects');
  localStorage.removeItem('eternal-motion');
  useVisualEffects.setState({ simplified: false, motion: 'system' });
  delete document.documentElement.dataset.visualEffects;
  delete document.documentElement.dataset.motion;
});

describe('device visual effects preference', () => {
  it('updates CSS and storage, synchronizes another tab and removes listeners', () => {
    const dispose = initializeVisualEffects();
    useVisualEffects.getState().setSimplified(true);
    expect(localStorage.getItem('eternal-visual-effects')).toBe('reduced');
    expect(document.documentElement.dataset.visualEffects).toBe('reduced');
    localStorage.setItem('eternal-visual-effects', 'full');
    window.dispatchEvent(new StorageEvent('storage', { key: 'eternal-visual-effects' }));
    expect(useVisualEffects.getState().simplified).toBe(false);
    expect(document.documentElement.dataset.visualEffects).toBe('full');
    dispose();
    useVisualEffects.getState().setSimplified(true);
    expect(document.documentElement.dataset.visualEffects).toBe('full');
  });
});

describe('interface motion preference', () => {
  it('persists an explicit override, follows cross-tab changes and rejects unknown values', () => {
    const dispose = initializeVisualEffects();
    expect(document.documentElement.dataset.motion).toBe('system');
    useVisualEffects.getState().setMotion('full');
    expect(localStorage.getItem('eternal-motion')).toBe('full');
    expect(document.documentElement.dataset.motion).toBe('full');
    localStorage.setItem('eternal-motion', 'reduced');
    window.dispatchEvent(new StorageEvent('storage', { key: 'eternal-motion' }));
    expect(useVisualEffects.getState().motion).toBe('reduced');
    expect(document.documentElement.dataset.motion).toBe('reduced');
    localStorage.setItem('eternal-motion', 'invalid');
    window.dispatchEvent(new StorageEvent('storage', { key: 'eternal-motion' }));
    expect(useVisualEffects.getState().motion).toBe('system');
    dispose();
    useVisualEffects.getState().setMotion('full');
    expect(document.documentElement.dataset.motion).toBe('system');
  });
});

it('resolves explicit motion before the operating system preference', () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    })),
  );
  expect(shouldReduceMotion()).toBe(true);
  useVisualEffects.getState().setMotion('full');
  expect(shouldReduceMotion()).toBe(false);
  useVisualEffects.getState().setMotion('reduced');
  expect(shouldReduceMotion()).toBe(true);
});
