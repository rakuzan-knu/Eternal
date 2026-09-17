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

  it('toggles password visibility, validates length and matching confirmation', async () => {
    render(<ArchivePasswordGate onUnlock={vi.fn()} />);

    const toggleBtn = screen.getByRole('button', { name: 'Show password' });
    fireEvent.click(toggleBtn);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'text');

    // Too short
    const pwdInput = screen.getByPlaceholderText('Password');
    const confirmInput = screen.getByPlaceholderText('Confirm password');
    fireEvent.change(pwdInput, { target: { value: '12' } });
    fireEvent.change(confirmInput, { target: { value: '12' } });

    const submitBtn = screen.getByRole('button', { name: /set password & unlock/i });
    fireEvent.click(submitBtn);
    expect(screen.getByText('Use at least 4 characters.')).toBeInTheDocument();

    // Mismatch
    const freshPwdInput = screen.getByPlaceholderText('Password');
    const freshConfirmInput = screen.getByPlaceholderText('Confirm password');
    fireEvent.change(freshPwdInput, { target: { value: '1234' } });
    fireEvent.change(freshConfirmInput, { target: { value: '5678' } });
    const freshSubmitBtn = screen.getByRole('button', { name: /set password & unlock/i });
    fireEvent.click(freshSubmitBtn);
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
  });

  it('shows error on wrong password and resets password on forgot password click', async () => {
    useArchivePasswordStore.setState({
      passwordHash: { algo: 'PBKDF2', salt: 's', hash: 'h' },
    });
    render(<ArchivePasswordGate onUnlock={vi.fn()} />);

    const pwdInput = screen.getByPlaceholderText('Password');
    fireEvent.change(pwdInput, { target: { value: 'wrong-pass' } });

    const unlockBtn = screen.getByRole('button', { name: 'Unlock' });
    fireEvent.click(unlockBtn);

    await waitFor(() => {
      expect(screen.getByText(/incorrect password/i)).toBeInTheDocument();
    });

    // Reset password
    const resetBtn = screen.getByRole('button', { name: /forgot password/i });
    fireEvent.click(resetBtn);
    expect(useArchivePasswordStore.getState().passwordHash).toBeNull();
  });

  it('handles setPassword rejection and verify rejection with error messages', async () => {
    // 1. setPassword rejection
    const origSetPassword = useArchivePasswordStore.getState().setPassword;
    useArchivePasswordStore.setState({
      setPassword: vi.fn().mockRejectedValueOnce(new Error('Crypto failed')),
    });
    const { unmount } = render(<ArchivePasswordGate onUnlock={vi.fn()} />);
    const pwdInput = screen.getByPlaceholderText('Password');
    const confirmInput = screen.getByPlaceholderText('Confirm password');
    fireEvent.change(pwdInput, { target: { value: '1234' } });
    fireEvent.change(confirmInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /set password & unlock/i }));

    await waitFor(() => {
      expect(screen.getByText('Could not set the password on this device.')).toBeInTheDocument();
    });
    unmount();
    useArchivePasswordStore.setState({ setPassword: origSetPassword });

    // 2. verify rejection
    const origVerify = useArchivePasswordStore.getState().verify;
    useArchivePasswordStore.setState({
      passwordHash: { algo: 'PBKDF2', salt: 's', hash: 'h' },
      verify: vi.fn().mockRejectedValueOnce(new Error('Decrypt failed')),
    });
    render(<ArchivePasswordGate onUnlock={vi.fn()} />);
    const verifyInput = screen.getByPlaceholderText('Password');
    fireEvent.change(verifyInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    await waitFor(() => {
      expect(screen.getByText('Could not verify the password on this device.')).toBeInTheDocument();
    });
    useArchivePasswordStore.setState({ verify: origVerify });
  });

  it('calls onUnlock when verify returns true', async () => {
    await useArchivePasswordStore.getState().setPassword('correct-pass');
    const onUnlock = vi.fn();
    render(<ArchivePasswordGate onUnlock={onUnlock} />);

    const verifyInput = screen.getByPlaceholderText('Password');
    fireEvent.change(verifyInput, { target: { value: 'correct-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    await waitFor(() => {
      expect(onUnlock).toHaveBeenCalled();
    });
  });
});
