import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddGifButton } from '../AddGifButton';

function mockBoundingRectTop(top: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + 40,
    left: 100,
    right: 140,
    width: 40,
    height: 40,
    x: 100,
    y: top,
    toJSON: () => {},
  });
}

describe('AddGifButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render the gif grid when isOpen is false', () => {
    render(<AddGifButton isOpen={false} onToggle={vi.fn()} onGifSelect={vi.fn()} />);

    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('renders the gif grid when isOpen is true', () => {
    render(<AddGifButton isOpen={true} onToggle={vi.fn()} onGifSelect={vi.fn()} />);

    expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
  });

  it('calls onToggle when the trigger button is clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<AddGifButton isOpen={false} onToggle={onToggle} onGifSelect={vi.fn()} />);

    await user.click(screen.getByTitle('Add GIF'));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('does nothing when disabled', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <AddGifButton isOpen={false} disabled={true} onToggle={onToggle} onGifSelect={vi.fn()} />,
    );

    await user.click(screen.getByTitle('Add GIF'));
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('calls onGifSelect with the clicked gif url', async () => {
    const onGifSelect = vi.fn();
    const user = userEvent.setup();
    render(<AddGifButton isOpen={true} onToggle={vi.fn()} onGifSelect={onGifSelect} />);
    const firstGif = screen.getAllByRole('img')[0];

    await user.click(firstGif);

    expect(onGifSelect).toHaveBeenCalledWith(firstGif.getAttribute('src'));
  });

  it('opens the panel above the button (bottom-full) when there is enough room above (rect.top >= 280)', async () => {
    mockBoundingRectTop(500);
    const user = userEvent.setup();
    const { rerender } = render(
      <AddGifButton isOpen={false} onToggle={vi.fn()} onGifSelect={vi.fn()} />,
    );

    await user.click(screen.getByTitle('Add GIF'));
    rerender(<AddGifButton isOpen={true} onToggle={vi.fn()} onGifSelect={vi.fn()} />);

    expect(screen.getAllByRole('img')[0].closest('div.absolute')).toHaveClass(
      'bottom-full',
      'mb-3',
    );
  });

  it('opens the panel below the button (top-full) when there is not enough room above (rect.top < 280)', async () => {
    mockBoundingRectTop(100);
    const user = userEvent.setup();
    const { rerender } = render(
      <AddGifButton isOpen={false} onToggle={vi.fn()} onGifSelect={vi.fn()} />,
    );

    await user.click(screen.getByTitle('Add GIF'));
    rerender(<AddGifButton isOpen={true} onToggle={vi.fn()} onGifSelect={vi.fn()} />);

    expect(screen.getAllByRole('img')[0].closest('div.absolute')).toHaveClass('top-full', 'mt-3');
  });

  it('supports usePortal and outside click / escape dismiss', async () => {
    mockBoundingRectTop(300);
    const onToggle = vi.fn();
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <AddGifButton isOpen={true} usePortal={true} onToggle={onToggle} onGifSelect={vi.fn()} />
      </div>,
    );

    expect(screen.getAllByRole('img').length).toBeGreaterThan(0);

    fireEvent(window, new Event('resize'));
    fireEvent(window, new Event('scroll'));

    // Outside click
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onToggle).toHaveBeenCalledTimes(1);

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('calculates top position for portal when bottom space is constrained', () => {
    mockBoundingRectTop(600);
    render(
      <AddGifButton isOpen={true} usePortal={true} onToggle={vi.fn()} onGifSelect={vi.fn()} />,
    );
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0);
  });
});
