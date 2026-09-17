import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DevicePasswordSetupModal from '../DevicePasswordSetupModal';
import { useDevicePasswordStore } from '../../../model/useDevicePasswordStore';
import React from 'react';

describe('DevicePasswordSetupModal', () => {
  it('sets device password and closes modal on matching confirmation', async () => {
    const mockSetPassword = vi.fn().mockResolvedValue(undefined);
    useDevicePasswordStore.setState({ setPassword: mockSetPassword });
    const onClose = vi.fn();

    render(<DevicePasswordSetupModal onClose={onClose} />);

    expect(screen.getByText('Device passcode')).toBeInTheDocument();

    const passInputs = screen.getAllByPlaceholderText(/passcode/i);
    fireEvent.change(passInputs[0], { target: { value: 'secret123' } });
    fireEvent.change(passInputs[1], { target: { value: 'secret123' } });

    const submitBtn = screen.getByRole('button', { name: 'Set passcode' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSetPassword).toHaveBeenCalledWith('secret123');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('validates empty passcode and passcode mismatch, and toggles visibility', async () => {
    render(<DevicePasswordSetupModal onClose={vi.fn()} />);

    const showBtn = screen.getByRole('button', { name: 'Show' });
    fireEvent.click(showBtn);

    const submitBtn = screen.getByRole('button', { name: 'Set passcode' });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Passcode cannot be empty.')).toBeInTheDocument();

    const passInputsAfterShake = screen.getAllByPlaceholderText(/passcode/i);
    fireEvent.change(passInputsAfterShake[0], { target: { value: 'pass1' } });
    fireEvent.change(passInputsAfterShake[1], { target: { value: 'pass2' } });
    const freshSubmitBtn = screen.getByRole('button', { name: 'Set passcode' });
    fireEvent.click(freshSubmitBtn);

    expect(screen.getByText('Passcodes do not match.')).toBeInTheDocument();
  });
});
