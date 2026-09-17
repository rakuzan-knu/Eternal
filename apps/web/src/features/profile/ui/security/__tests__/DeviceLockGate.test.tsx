import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeviceLockGate from '../DeviceLockGate';
import React from 'react';

const mockStore = {
  stored: null as { algo: string; salt: string; hash: string } | null,
  unlocked: false,
  verify: vi.fn(),
};

vi.mock('../../../model/useDevicePasswordStore', () => ({
  useDevicePasswordStore: (selector?: (state: typeof mockStore) => unknown) =>
    selector ? selector(mockStore) : mockStore,
}));

describe('DeviceLockGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.stored = null;
    mockStore.unlocked = false;
    mockStore.verify = vi.fn();
  });

  it('renders children when no password is set', () => {
    render(
      <DeviceLockGate>
        <div>Protected Content</div>
      </DeviceLockGate>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders locked form when device passcode is set, handles unlock and error', async () => {
    const verifyMock = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mockStore.stored = { algo: 'sha256', salt: 'salt', hash: 'hash' };
    mockStore.unlocked = false;
    mockStore.verify = verifyMock;

    render(
      <DeviceLockGate>
        <div>Protected Content</div>
      </DeviceLockGate>,
    );

    expect(screen.getByText('App locked')).toBeInTheDocument();

    // Toggle visibility
    const showBtn = screen.getByRole('button', { name: 'Show' });
    fireEvent.click(showBtn);

    const input = screen.getByPlaceholderText('Passcode');
    fireEvent.change(input, { target: { value: 'wrongpass' } });

    const submitBtn = screen.getByRole('button', { name: 'Unlock' });
    fireEvent.click(submitBtn);

    await screen.findByText('Incorrect passcode.');

    // Correct passcode (query fresh input after shakeKey remount)
    const freshInput = screen.getByPlaceholderText('Passcode');
    fireEvent.change(freshInput, { target: { value: 'correctpass' } });
    const freshSubmitBtn = screen.getByRole('button', { name: 'Unlock' });
    fireEvent.click(freshSubmitBtn);

    expect(verifyMock).toHaveBeenCalledWith('correctpass');
  });
});
