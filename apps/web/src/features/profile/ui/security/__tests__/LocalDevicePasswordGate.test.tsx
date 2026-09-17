import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LocalDevicePasswordGate from '../LocalDevicePasswordGate';
import React from 'react';

vi.mock('../../../model/useDevicePasswordStore', () => {
  const storeState = {
    stored: { algo: 'PBKDF2', salt: 'salt123', hash: 'hash123' },
    unlocked: false,
    disable: vi.fn(),
    verify: vi.fn().mockResolvedValue(true),
  };
  return {
    useDevicePasswordStore: (selector?: (state: typeof storeState) => unknown) =>
      selector ? selector(storeState) : storeState,
  };
});

describe('LocalDevicePasswordGate', () => {
  it('renders device passcode toggle settings', async () => {
    render(<LocalDevicePasswordGate />);

    expect(screen.getByText('Device passcode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();

    const { useDevicePasswordStore } = await import('../../../model/useDevicePasswordStore');
    const { fireEvent } = await import('@testing-library/react');

    const removeBtn = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(removeBtn);
    expect(useDevicePasswordStore().disable).toHaveBeenCalled();

    const changeBtn = screen.getByRole('button', { name: 'Change' });
    fireEvent.click(changeBtn);
    expect(screen.getAllByPlaceholderText(/passcode/i).length).toBeGreaterThan(0);
  });
});
