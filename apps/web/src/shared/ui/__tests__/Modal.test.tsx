import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Modal from '../Modal';

describe('Modal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders modal content in portal and closes on backdrop click', () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose}>
        {(requestClose) => (
          <div>
            <p>Modal Body</p>
            <button onClick={requestClose}>Close Me</button>
          </div>
        )}
      </Modal>,
    );

    expect(screen.getByText('Modal Body')).toBeInTheDocument();

    const closeBtn = screen.getByText('Close Me');
    fireEvent.click(closeBtn);
    // Click again while closing
    fireEvent.click(closeBtn);

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press and backdrop click', () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose}>{() => <div>Modal Content</div>}</Modal>);

    // Backdrop click
    const backdrop = screen.getByText('Modal Content').parentElement!.parentElement!;
    fireEvent.click(backdrop);

    fireEvent.keyDown(window, { key: 'Escape' });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes immediately with reduced motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    const onClose = vi.fn();
    const view = render(
      <Modal onClose={onClose}>{(close) => <button onClick={close}>Close</button>}</Modal>,
    );
    fireEvent.click(screen.getByText('Close'));
    act(() => vi.advanceTimersByTime(0));
    expect(onClose).toHaveBeenCalledTimes(1);
    view.unmount();
    vi.restoreAllMocks();
  });

  it('cancels a pending close callback when unmounted', () => {
    const onClose = vi.fn();
    const view = render(
      <Modal onClose={onClose}>{(close) => <button onClick={close}>Close</button>}</Modal>,
    );
    fireEvent.click(screen.getByText('Close'));
    view.unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(onClose).not.toHaveBeenCalled();
  });
});
