import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { SecretChatVerificationModal } from '../SecretChatVerificationModal';
import * as identityKeys from '../../lib/e2ee/identityKeys';

vi.mock('../../lib/e2ee/identityKeys', () => ({
  fetchPeerIdentityKeyCached: vi.fn(),
  fingerprintIdentityKey: vi.fn(),
  exportIdentityPublicKey: vi.fn(),
  pinIdentityKey: vi.fn(),
  isPinnedMatch: vi.fn(),
}));

describe('SecretChatVerificationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SecretChatVerificationModal
        isOpen={false}
        onClose={vi.fn()}
        peerUserId="user-1"
        peerDisplayName="Alice"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders SAS emojis, fingerprint, and handles Mark as Verified', async () => {
    vi.mocked(identityKeys.fetchPeerIdentityKeyCached).mockResolvedValue('mock-peer-key-b64');
    vi.mocked(identityKeys.exportIdentityPublicKey).mockResolvedValue('mock-my-key-b64');
    vi.mocked(identityKeys.fingerprintIdentityKey).mockImplementation(async (key) =>
      key === 'mock-peer-key-b64' ? 'e4a1b2c3d4e5f678' : '1122334455667788',
    );
    vi.mocked(identityKeys.isPinnedMatch).mockResolvedValue(false);

    render(
      <SecretChatVerificationModal
        isOpen={true}
        onClose={vi.fn()}
        peerUserId="user-alice"
        peerDisplayName="Alice"
      />,
    );

    expect(screen.getByText('End-to-End Encryption')).toBeDefined();
    expect(screen.getByText(/Telegram \/ Signal Secret Chat/)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('Visual Safety SAS Emojis')).toBeDefined();
    });

    const verifyBtn = screen.getByRole('button', { name: /Mark as Verified/i });
    expect(verifyBtn).toBeDefined();

    fireEvent.click(verifyBtn);

    expect(identityKeys.pinIdentityKey).toHaveBeenCalledWith('user-alice', 'e4a1b2c3d4e5f678');
    expect(screen.getByText('Verified Identity')).toBeDefined();
  });
});
