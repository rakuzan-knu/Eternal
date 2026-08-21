import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SelectThemeModal from '../SelectThemeModal';
import { chatApi } from '../../api/chatApi';
import React from 'react';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    setTheme: vi.fn(),
  },
}));

describe('SelectThemeModal', () => {
  it('selects theme and applies theme via API call', async () => {
    vi.mocked(chatApi.setTheme).mockResolvedValue({ success: true } as unknown as never);
    const onClose = vi.fn();

    render(<SelectThemeModal conversationId="c1" currentTheme="default" onClose={onClose} />);

    expect(screen.getByText('Chat Theme')).toBeInTheDocument();
    expect(screen.getByText('Midnight Purple')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Midnight Purple'));

    const applyBtn = screen.getByRole('button', { name: 'Apply Theme' });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(chatApi.setTheme).toHaveBeenCalledWith('c1', 'midnight-purple');
      expect(onClose).toHaveBeenCalled();
    });
  });
});
