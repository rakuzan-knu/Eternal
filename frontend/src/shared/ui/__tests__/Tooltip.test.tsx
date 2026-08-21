import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Tooltip from '../Tooltip';

describe('Tooltip', () => {
  it('renders children trigger element', () => {
    act(() => {
      render(
        <Tooltip label="Helpful tip">
          <button>Hover me</button>
        </Tooltip>,
      );
    });

    expect(screen.getByText('Hover me')).toBeInTheDocument();
    expect(screen.queryByText('Helpful tip')).not.toBeInTheDocument();
  });

  it('shows tooltip portal on mouse enter and hides on mouse leave', async () => {
    vi.useFakeTimers();
    act(() => {
      render(
        <Tooltip label="Helpful tip" position="top">
          <button>Hover me</button>
        </Tooltip>,
      );
    });

    const trigger = screen.getByText('Hover me').parentElement!;
    act(() => {
      fireEvent.mouseEnter(trigger);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Helpful tip')).toBeInTheDocument();

    act(() => {
      fireEvent.mouseLeave(trigger);
    });

    // Fast-forward timers to complete the hide animation (120ms)
    await act(async () => {
      vi.advanceTimersByTime(150);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
