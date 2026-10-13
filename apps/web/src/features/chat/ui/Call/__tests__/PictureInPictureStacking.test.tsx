import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PictureInPicture } from '../PictureInPicture';
import { useCallStore } from '../../../model/callStore';
import { usePiPStackStore } from '@/shared/lib/pipStackCoordinator';

vi.mock('../../../model/CallContext', () => ({
  useCall: () => ({
    endCall: vi.fn(),
    toggleMute: vi.fn(),
    toggleDeafen: vi.fn(),
    toggleVideo: vi.fn(),
    toggleScreenShare: vi.fn(),
  }),
}));

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'user-me', username: 'me', displayName: 'Me', avatar: null },
  }),
}));

describe('PictureInPicture PiP Stacking with Player', () => {
  beforeEach(() => {
    usePiPStackStore.setState({ activeOrder: [] });
    useCallStore.setState({
      isPiP: true,
      callStatus: 'connected',
      remoteParticipant: {
        id: 'remote-1',
        username: 'alice',
        displayName: 'Alice',
        avatar: null,
      },
      remoteStreams: {},
      screenShareStream: null,
      localStream: null,
      durationSec: 42,
      isMuted: false,
      isDeafened: false,
      isVideoOff: true,
      isScreenSharing: false,
      dominantSpeakerId: 'remote-1',
      localIsSpeaking: false,
      remoteIsSpeaking: true,
    });
  });

  it('renders at default bottom 84px when alone', () => {
    render(<PictureInPicture />);
    const pipCard = screen.getByRole('region', {
      name: /Picture in Picture Voice Call/i,
    });
    expect(pipCard).toBeInTheDocument();
    expect(pipCard.style.bottom).toContain('84px');
  });

  it('stacks at 294px when player is already registered at bottom', () => {
    // Player is registered first:
    usePiPStackStore.setState({ activeOrder: ['player'] });

    render(<PictureInPicture />);
    const pipCard = screen.getByRole('region', {
      name: /Picture in Picture Voice Call/i,
    });
    expect(pipCard).toBeInTheDocument();
    expect(pipCard.style.bottom).toContain('294px');
  });
});
