import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DeviceLockGate from '../DeviceLockGate';
import React from 'react';

vi.mock('../../../model/useDevicePasswordStore', () => {
  const storeState = {
    stored: null as { algo: string; salt: string; hash: string } | null,
    unlocked: false,
    verify: vi.fn(),
  };
  return {
    useDevicePasswordStore: (selector?: (state: typeof storeState) => unknown) =>
      selector ? selector(storeState) : storeState,
  };
});

describe('DeviceLockGate', () => {
  it('renders children when no password is set', () => {
    render(
      <DeviceLockGate>
        <div>Protected Content</div>
      </DeviceLockGate>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
