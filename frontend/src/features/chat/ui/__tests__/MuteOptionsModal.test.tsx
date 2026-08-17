import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MuteOptionsModal from '../MuteOptionsModal';

describe('MuteOptionsModal', () => {
  it('renders duration and level options, and confirms mute selection', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(<MuteOptionsModal onClose={onClose} onConfirm={onConfirm} />);

    expect(screen.getByText('Mute conversation')).toBeInTheDocument();
    expect(screen.getByText('For 1 hour')).toBeInTheDocument();
    expect(screen.getByText('Until I turn it back on')).toBeInTheDocument();

    const muteBtn = screen.getByRole('button', { name: /^mute$/i });
    fireEvent.click(muteBtn);

    expect(onConfirm).toHaveBeenCalledWith('MESSAGES_AND_CALLS');
  });
});
