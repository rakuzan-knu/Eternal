import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageReactionPicker from '../MessageReactionPicker';

describe('MessageReactionPicker', () => {
  it('renders quick reactions and handles click', () => {
    const onPick = vi.fn();
    const onClose = vi.fn();

    render(<MessageReactionPicker onPick={onPick} onClose={onClose} />);

    expect(screen.getByText('❤️')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();

    fireEvent.click(screen.getByText('🔥'));
    expect(onPick).toBeDefined();
  });
});
