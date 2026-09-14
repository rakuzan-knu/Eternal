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

  it('clamps tooltip position to remain within viewport margins when near right screen edge', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });

    act(() => {
      render(
        <Tooltip label="Collapse Your Library" position="bottom">
          <button>Edge button</button>
        </Tooltip>,
      );
    });

    const trigger = screen.getByText('Edge button').parentElement!;
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      left: 950,
      right: 980,
      top: 20,
      bottom: 50,
      width: 30,
      height: 30,
      x: 950,
      y: 20,
      toJSON: () => {},
    });

    act(() => {
      fireEvent.mouseEnter(trigger);
    });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();

    const leftPx = parseInt(tooltip.style.left, 10);
    expect(leftPx).toBeLessThanOrEqual(1000 - 10);
    expect(leftPx).toBeGreaterThanOrEqual(10);
  });
});
