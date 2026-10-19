import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MotionSettings } from '../MotionSettings';
import { useVisualEffects } from '@/shared/model/useVisualEffects';

afterEach(() => {
  useVisualEffects.setState({ motion: 'system' });
  localStorage.removeItem('eternal-motion');
});

describe('interface motion controls', () => {
  it('offers an explicit full-motion override and a system default', () => {
    render(<MotionSettings />);
    expect(screen.getByRole('radio', { name: 'Use device setting' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Full animations' }));
    expect(useVisualEffects.getState().motion).toBe('full');
    expect(screen.getByRole('radio', { name: 'Full animations' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'Reduced motion' }));
    expect(useVisualEffects.getState().motion).toBe('reduced');
  });
});
