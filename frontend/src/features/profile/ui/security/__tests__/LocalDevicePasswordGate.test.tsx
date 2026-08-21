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
  it('renders device passcode toggle settings', () => {
    render(<LocalDevicePasswordGate />);

    expect(screen.getByText('Device passcode')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
  });
});
