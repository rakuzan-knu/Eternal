import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RestrictUserModal from '../RestrictUserModal';
import { chatApi } from '../../api/chatApi';
import React from 'react';

vi.mock('../../api/chatApi', () => ({
  chatApi: {
    restrictAccount: vi.fn(),
  },
}));

describe('RestrictUserModal', () => {
  it('renders restrict account info and calls restrict API', async () => {
    vi.mocked(chatApi.restrictAccount).mockResolvedValue({ success: true } as unknown as never);
    const onClose = vi.fn();

    render(<RestrictUserModal userId="target-u1" onClose={onClose} />);

    expect(screen.getByText('Restrict Account')).toBeInTheDocument();
    expect(screen.getByText(/Restricting limits unwanted interactions/i)).toBeInTheDocument();

    const restrictBtn = screen.getByRole('button', { name: 'Restrict' });
    fireEvent.click(restrictBtn);

    await waitFor(() => {
      expect(chatApi.restrictAccount).toHaveBeenCalledWith('target-u1');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles error in restrictAccount gracefully', async () => {
    vi.mocked(chatApi.restrictAccount).mockRejectedValueOnce(new Error('Network error'));
    const onClose = vi.fn();

    render(<RestrictUserModal userId="target-u1" onClose={onClose} />);

    const restrictBtn = screen.getByRole('button', { name: 'Restrict' });
    fireEvent.click(restrictBtn);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
