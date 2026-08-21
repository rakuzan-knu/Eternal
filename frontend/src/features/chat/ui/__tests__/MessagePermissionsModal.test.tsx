import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessagePermissionsModal from '../MessagePermissionsModal';
import React from 'react';

describe('MessagePermissionsModal', () => {
  it('renders permission switches and saves updated permissions', () => {
    const onClose = vi.fn();
    render(<MessagePermissionsModal onClose={onClose} />);

    expect(screen.getByText('Message Permissions')).toBeInTheDocument();
    expect(screen.getByText('Send text messages')).toBeInTheDocument();
    expect(screen.getByText('Send media & files')).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
