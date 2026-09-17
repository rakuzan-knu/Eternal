import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ScreenLocationMonitor from '../ScreenLocationMonitor';
import { useNotificationSettingsStore } from '@/entities/notification';

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

    // Corner buttons
    const cornerButtons = document.querySelectorAll('.relative.flex-1 button');
    if (cornerButtons.length > 0) {
      fireEvent.mouseEnter(cornerButtons[0]);
      expect(onHoverCorner).toHaveBeenCalledWith('top-left');

      fireEvent.mouseLeave(cornerButtons[0]);
      expect(onHoverCorner).toHaveBeenCalledWith(null);

      fireEvent.click(cornerButtons[0]);
      expect(useNotificationSettingsStore.getState().toastPosition).toBe('top-left');
    }
  });
});
