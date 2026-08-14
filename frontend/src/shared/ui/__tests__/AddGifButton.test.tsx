import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddGifButton } from '../AddGifButton';

function mockBoundingRectTop(top: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
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
});
