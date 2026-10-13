import { afterEach, describe, expect, it } from 'vitest';
import { initializeVisualEffects, useVisualEffects } from '../useVisualEffects';

afterEach(() => {
  localStorage.removeItem('eternal-visual-effects');
  useVisualEffects.setState({ simplified: false });
  delete document.documentElement.dataset.visualEffects;
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
