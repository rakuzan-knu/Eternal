import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExpandedReactionPicker from '../ExpandedReactionPicker';

describe('ExpandedReactionPicker', () => {
  it('renders categories, tabs, and search bar', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();

    render(<ExpandedReactionPicker onPick={onPick} onClose={onClose} />);

    expect(screen.getByPlaceholderText('Search emoji...')).toBeInTheDocument();
    expect(screen.getByText('Popular')).toBeInTheDocument();
  });

  it('filters emojis via search input', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();

    render(<ExpandedReactionPicker onPick={onPick} onClose={onClose} />);

    const searchInput = screen.getByPlaceholderText('Search emoji...');
    fireEvent.change(searchInput, { target: { value: '🦄' } });

    expect(screen.getByTitle('React with 🦄')).toBeInTheDocument();
    expect(screen.queryByTitle('React with 💩')).not.toBeInTheDocument();
  });

  it('picks emoji and calls onPick and onClose', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();

    render(<ExpandedReactionPicker onPick={onPick} onClose={onClose} />);

    const heartBtns = screen.getAllByTitle('React with ❤️');
    expect(heartBtns.length).toBeGreaterThan(0);
    fireEvent.click(heartBtns[0]);

    expect(onPick).toHaveBeenCalledWith('❤️', expect.any(Object));
    expect(onClose).toHaveBeenCalled();
  });

  it('handles tab selection, empty search results, and outside click', () => {
    const onClose = vi.fn();
    render(<ExpandedReactionPicker onPick={vi.fn()} onClose={onClose} />);

    // Click Celebrate tab
    const celebrateTab = screen.getByTitle('Celebration');
    fireEvent.click(celebrateTab);
    expect(screen.getByText('Celebration')).toBeInTheDocument();

    // Search query with no match
    const searchInput = screen.getByPlaceholderText('Search emoji...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent_emoji_string' } });
    expect(screen.getByText(/No emojis found for/i)).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it('supports align="right"', () => {
    const { container } = render(
      <ExpandedReactionPicker onPick={vi.fn()} onClose={vi.fn()} align="right" />,
    );
    expect(container.firstChild).toHaveClass('right-0');
  });
});
