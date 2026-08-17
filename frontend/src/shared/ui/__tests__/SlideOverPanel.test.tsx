import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SlideOverPanel from '../SlideOverPanel';

describe('SlideOverPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders title and children and closes on back button or Escape key', () => {
    const onClose = vi.fn();
    render(
      <SlideOverPanel title="Panel Title" onClose={onClose}>
        <div>Panel content</div>
      </SlideOverPanel>,
    );

    expect(screen.getByText('Panel Title')).toBeInTheDocument();
    expect(screen.getByText('Panel content')).toBeInTheDocument();

    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('closes when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(
      <SlideOverPanel title="Panel Title" onClose={onClose}>
        <div>Content</div>
      </SlideOverPanel>,
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalled();
  });
});
