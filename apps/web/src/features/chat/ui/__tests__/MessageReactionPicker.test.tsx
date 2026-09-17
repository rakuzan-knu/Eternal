import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageReactionPicker from '../MessageReactionPicker';
import { DEFAULT_RECENT_REACTIONS } from '../../model/useRecentReactions';

describe('MessageReactionPicker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the 6 recent reactions and responds to pick', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();

    render(<MessageReactionPicker onPick={onPick} onClose={onClose} />);

    DEFAULT_RECENT_REACTIONS.slice(0, 6).forEach((emoji) => {
      expect(screen.getByText(emoji)).toBeInTheDocument();
    });

    const fireButton = screen.getByTitle('React with 🔥');
    fireEvent.click(fireButton);

    expect(onPick).toHaveBeenCalledWith('🔥', expect.any(Object));
    expect(onClose).toHaveBeenCalled();
  });

  it('updates transform on mouse move for dock magnification', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();

    const { container } = render(<MessageReactionPicker onPick={onPick} onClose={onClose} />);

    const bar = container.querySelector('.relative.flex.items-center');
    expect(bar).toBeInTheDocument();

    fireEvent.mouseMove(bar!, { clientX: 50, clientY: 50 });
    const heartBtn = screen.getByTitle('React with ❤️');
    expect(heartBtn.style.transform).toBeDefined();

    fireEvent.mouseLeave(bar!);
    expect(heartBtn.style.transform).toContain('scale(1)');
  });

  it('opens ExpandedReactionPicker when clicking chevron down button', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();

    render(<MessageReactionPicker onPick={onPick} onClose={onClose} />);

    const chevronButton = screen.getByTitle('All reactions');
    expect(chevronButton).toBeInTheDocument();

    fireEvent.click(chevronButton);

    // Should now display the search input and category tabs of ExpandedReactionPicker
    expect(screen.getByPlaceholderText('Search emoji...')).toBeInTheDocument();
    expect(screen.getByText('Popular')).toBeInTheDocument();

    // Pick an emoji from expanded picker (e.g. 😈)
    const devilButton = screen.getByTitle('React with 😈');
    fireEvent.click(devilButton);

    expect(onPick).toHaveBeenCalledWith('😈', expect.any(Object));
  });

  it('closes on click outside', () => {
    const onClose = vi.fn();
    render(<MessageReactionPicker onPick={vi.fn()} onClose={onClose} />);

    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it('supports align="right" and handles mouse move when item ref is missing', () => {
    const { container } = render(
      <MessageReactionPicker onPick={vi.fn()} onClose={vi.fn()} align="right" />,
    );
    expect(container.firstChild).toHaveClass('right-0');

    const bar = container.querySelector('.relative.flex.items-center')!;
    fireEvent.mouseMove(bar, { clientX: 200, clientY: 200 });
  });
});
