import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SelectToneModal from '../SelectToneModal';

describe('SelectToneModal', () => {
  it('renders tone options and allows selecting and saving tone', () => {
    const onClose = vi.fn();

    render(<SelectToneModal conversationId="conv-1" onClose={onClose} />);

    expect(screen.getByText('Select chat tone')).toBeInTheDocument();
    expect(screen.getByText('Default Pop')).toBeInTheDocument();
    expect(screen.getByText('Crystal Chime')).toBeInTheDocument();

    const crystalBtn = screen.getByText('Crystal Chime');
    fireEvent.click(crystalBtn);

    const saveBtn = screen.getByRole('button', { name: /^Save$/i });
    fireEvent.click(saveBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
