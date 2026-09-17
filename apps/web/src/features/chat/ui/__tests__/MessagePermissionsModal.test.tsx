import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MessagePermissionsModal from '../MessagePermissionsModal';
import React from 'react';

describe('MessagePermissionsModal', () => {
  it('renders permission switches and saves updated permissions', async () => {
    const onClose = vi.fn();
    render(<MessagePermissionsModal onClose={onClose} />);

    expect(screen.getByText('Message Permissions')).toBeInTheDocument();
    expect(screen.getByText('Send text messages')).toBeInTheDocument();
    expect(screen.getByText('Send media & files')).toBeInTheDocument();

    // Toggle a permission
    const textOption = screen.getByText('Send text messages');
    fireEvent.click(textOption);

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('cancels without saving', async () => {
    const onClose = vi.fn();
    render(<MessagePermissionsModal onClose={onClose} />);

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
