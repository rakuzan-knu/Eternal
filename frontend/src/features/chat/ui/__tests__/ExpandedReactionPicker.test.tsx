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
});
