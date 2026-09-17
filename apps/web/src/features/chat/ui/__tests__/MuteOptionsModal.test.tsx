import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MuteOptionsModal from '../MuteOptionsModal';
import React from 'react';

describe('MuteOptionsModal', () => {
  it('renders duration and level options, and confirms mute selection with specific duration and infinite', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    const { rerender } = render(<MuteOptionsModal onClose={onClose} onConfirm={onConfirm} />);

    expect(screen.getByText('Mute conversation')).toBeInTheDocument();
    expect(screen.getByText('For 1 hour')).toBeInTheDocument();

    // Select 1 hour duration
    const oneHourRadio = screen.getByText('For 1 hour');
    fireEvent.click(oneHourRadio);

    // Select Calls only
    const callsOnlyRadio = screen.getByText('Mute call notifications');
    fireEvent.click(callsOnlyRadio);

    const muteBtn = screen.getByRole('button', { name: /^mute$/i });
    fireEvent.click(muteBtn);

    expect(onConfirm).toHaveBeenCalledWith('CALLS', expect.any(String));

    // Confirm with Until I turn it back on
    rerender(<MuteOptionsModal onClose={onClose} onConfirm={onConfirm} />);
    const untilTurnOn = screen.getByText('Until I turn it back on');
    fireEvent.click(untilTurnOn);
    fireEvent.click(screen.getByText('Mute messages and calls'));
    fireEvent.click(screen.getByRole('button', { name: /^mute$/i }));
    expect(onConfirm).toHaveBeenCalledWith('MESSAGES_AND_CALLS');
  });
});
