import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SelectToneModal from '../SelectToneModal';
import React from 'react';

describe('SelectToneModal', () => {
  it('selects chat tone and saves selection in localStorage', () => {
    const onClose = vi.fn();

    render(<SelectToneModal conversationId="c1" onClose={onClose} />);

    expect(screen.getByText('Select chat tone')).toBeInTheDocument();
    expect(screen.getByText('Crystal Chime')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Crystal Chime'));

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    expect(localStorage.getItem('chat_tone_c1')).toBe('crystal');
    expect(onClose).toHaveBeenCalled();
  });
});
