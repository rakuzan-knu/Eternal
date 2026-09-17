import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SelectToneModal from '../SelectToneModal';
import React from 'react';

describe('SelectToneModal', () => {
  beforeEach(() => {
    const mockOscillator = {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { setValueAtTime: vi.fn() },
    };
    const mockGain = {
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    };
    (window as any).AudioContext = vi.fn().mockImplementation(() => ({
      createOscillator: () => mockOscillator,
      createGain: () => mockGain,
      currentTime: 0,
      destination: {},
    }));
  });

  it('selects chat tone, plays preview sound and saves selection in localStorage', () => {
    const onClose = vi.fn();

    render(<SelectToneModal conversationId="c1" onClose={onClose} />);

    expect(screen.getByText('Select chat tone')).toBeInTheDocument();
    expect(screen.getByText('Crystal Chime')).toBeInTheDocument();

    // Play preview sound button
    const playPreviewBtns = screen.getAllByTitle('Play preview');
    fireEvent.click(playPreviewBtns[0]);

    // Select Crystal Chime via click
    fireEvent.click(screen.getByText('Crystal Chime'));

    // Keyboard selection on Neon Pulse
    const pulseOption = screen.getByText('Neon Pulse').closest('[role="button"]')!;
    fireEvent.keyDown(pulseOption, { key: 'Enter' });

    // Cancel button
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();

    // Save button
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    expect(localStorage.getItem('chat_tone_c1')).toBe('pulse');
  });

  it('handles AudioContext throwing an error gracefully', () => {
    (window as any).AudioContext = vi.fn().mockImplementation(() => {
      throw new Error('Audio disabled');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<SelectToneModal conversationId="c2" onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('Crystal Chime'));
    expect(errSpy).toHaveBeenCalledWith('Failed to play preview tone', expect.any(Error));

    errSpy.mockRestore();
  });
});
