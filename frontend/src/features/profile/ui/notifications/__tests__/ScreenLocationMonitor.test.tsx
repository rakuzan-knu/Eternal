import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ScreenLocationMonitor from '../ScreenLocationMonitor';
import { useNotificationSettingsStore } from '@/shared/model/useNotificationSettingsStore';

describe('ScreenLocationMonitor', () => {
  beforeEach(() => {
    useNotificationSettingsStore.setState({
      toastPosition: 'top-right',
      maxToasts: 3,
    });
  });

  it('renders screen position selectors and handles corner click', () => {
    const onHoverCorner = vi.fn();
    render(<ScreenLocationMonitor hoveredCorner={null} onHoverCorner={onHoverCorner} />);

    expect(screen.getByText('Location on the screen')).toBeInTheDocument();
    expect(screen.getByText('Notifications count')).toBeInTheDocument();

    const maxCount5Btn = screen.getByRole('button', { name: '5' });
    fireEvent.click(maxCount5Btn);
    expect(useNotificationSettingsStore.getState().maxToasts).toBe(5);
  });
});
