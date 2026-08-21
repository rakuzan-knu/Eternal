import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ArchivePasswordGate from '../ArchivePasswordGate';
import { useArchivePasswordStore } from '../../model/useArchivePasswordStore';
import React from 'react';

describe('ArchivePasswordGate', () => {
  beforeEach(() => {
    useArchivePasswordStore.setState({ passwordHash: null });
  });

  it('renders set password flow when no password is set', async () => {
    const onUnlock = vi.fn();
    render(<ArchivePasswordGate onUnlock={onUnlock} />);

    expect(screen.getByText('Protect your archive')).toBeInTheDocument();

    const pwdInput = screen.getByPlaceholderText('Password');
    const confirmInput = screen.getByPlaceholderText('Confirm password');

    fireEvent.change(pwdInput, { target: { value: '1234' } });
    fireEvent.change(confirmInput, { target: { value: '1234' } });

    const submitBtn = screen.getByRole('button', { name: /set password & unlock/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onUnlock).toHaveBeenCalled();
    });
  });

  it('renders verify password flow when password is set', async () => {
    useArchivePasswordStore.setState({
      passwordHash: { algo: 'PBKDF2', salt: 's', hash: 'h' },
    });
    const onUnlock = vi.fn();
    render(<ArchivePasswordGate onUnlock={onUnlock} />);

    expect(screen.getByText('Archive locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
  });
});
