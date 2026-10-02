import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParticipantContextMenu } from '../ParticipantContextMenu';
import { useCallStore } from '../../../model/callStore';
import { globalSpeakerMixerManager } from '../../../lib/webrtc/perSpeakerMixer';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockToggleMute = vi.fn();
const mockToggleDeafen = vi.fn();
const mockEndCall = vi.fn();
const mockInitiateCall = vi.fn();

vi.mock('../../../model/CallContext', () => ({
  useCall: () => ({
    toggleMute: mockToggleMute,
    toggleDeafen: mockToggleDeafen,
    endCall: mockEndCall,
    initiateCall: mockInitiateCall,
  }),
}));

const mockOpenEditProfile = vi.fn();
vi.mock('@/shared/model/useUIStore', () => ({
  useUIStore: (selector: any) => selector({ openEditProfile: mockOpenEditProfile }),
}));

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: { id: 'user-me', username: 'myuser', displayName: 'My User', avatar: null },
  }),
}));

const mockBlockMutate = vi.fn();
const mockUnblockMutate = vi.fn();
vi.mock('../../../model/useConversationMutations', () => ({
  useBlockUser: () => ({ mutate: mockBlockMutate, isPending: false }),
  useUnblockUser: () => ({ mutate: mockUnblockMutate, isPending: false }),
}));

vi.mock('../../../model/useBlockedUsers', () => ({
  useBlockedUsers: () => ({ data: [] }),
}));

vi.mock('@/features/follow/model/useFriends', () => ({
  useFriends: () => ({ data: [] }),
}));

const mockFollowMutate = vi.fn();
vi.mock('@/features/follow/model/useFollowMutation', () => ({
  useFollowMutation: () => ({ mutate: mockFollowMutate, isPending: false }),
}));

vi.mock('@/entities/profile/api/userApi', () => ({
  userApi: {
    getProfile: vi.fn().mockResolvedValue({ isFollowing: false }),
  },
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: () => ({ data: null }),
  };
});

describe('ParticipantContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCallStore.setState({
      isMuted: false,
      isDeafened: false,
      remoteStreams: {},
    });
  });

  describe('Self Context Menu', () => {
    it('renders all self menu items according to Screenshot 1', () => {
      const onClose = vi.fn();
      const onOpenPreview = vi.fn();

      render(
        <ParticipantContextMenu
          user={{ id: 'user-me', username: 'myuser', displayName: 'My User', avatar: null }}
          isLocal={true}
          coords={{ x: 100, y: 100 }}
          onClose={onClose}
          onOpenPreview={onOpenPreview}
        />,
      );

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Mute')).toBeInTheDocument();
      expect(screen.getByText('Deafen')).toBeInTheDocument();
      expect(screen.getByText('Camera Preview')).toBeInTheDocument();
      expect(screen.getByText(/Voice & Video/)).toBeInTheDocument();
      expect(screen.queryByText(/Copy ID/)).not.toBeInTheDocument();
    });

    it('navigates to own profile and minimizes call to PiP when "Profile" is clicked', () => {
      const onClose = vi.fn();
      useCallStore.setState({ isPiP: false });
      render(
        <ParticipantContextMenu
          user={{ id: 'user-me', username: 'myuser', displayName: 'My User', avatar: null }}
          isLocal={true}
          coords={{ x: 100, y: 100 }}
          onClose={onClose}
          onOpenPreview={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText('Profile'));
      expect(onClose).toHaveBeenCalled();
      expect(useCallStore.getState().isPiP).toBe(true);
      expect(mockNavigate).toHaveBeenCalledWith('/profile/myuser');
    });

    it('toggles microphone when "Mute" is clicked', () => {
      render(
        <ParticipantContextMenu
          user={{ id: 'user-me', username: 'myuser', displayName: 'My User', avatar: null }}
          isLocal={true}
          coords={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onOpenPreview={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText('Mute'));
      expect(mockToggleMute).toHaveBeenCalled();
    });

    it('toggles deafen when "Deafen" is clicked', () => {
      render(
        <ParticipantContextMenu
          user={{ id: 'user-me', username: 'myuser', displayName: 'My User', avatar: null }}
          isLocal={true}
          coords={{ x: 100, y: 100 }}
          onClose={vi.fn()}
          onOpenPreview={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText('Deafen'));
      expect(mockToggleDeafen).toHaveBeenCalled();
    });

    it('opens camera preview modal when "Camera Preview" is clicked', () => {
      const onOpenPreview = vi.fn();
      const onClose = vi.fn();
      render(
        <ParticipantContextMenu
          user={{ id: 'user-me', username: 'myuser', displayName: 'My User', avatar: null }}
          isLocal={true}
          coords={{ x: 100, y: 100 }}
          onClose={onClose}
          onOpenPreview={onOpenPreview}
        />,
      );

      fireEvent.click(screen.getByText('Camera Preview'));
      expect(onClose).toHaveBeenCalled();
      expect(onOpenPreview).toHaveBeenCalled();
    });

    it('opens voice and video settings tab in EditProfileModal', () => {
      const onClose = vi.fn();
      render(
        <ParticipantContextMenu
          user={{ id: 'user-me', username: 'myuser', displayName: 'My User', avatar: null }}
          isLocal={true}
          coords={{ x: 100, y: 100 }}
          onClose={onClose}
          onOpenPreview={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText(/Voice & Video/));
      expect(onClose).toHaveBeenCalled();
      expect(mockOpenEditProfile).toHaveBeenCalledWith('sec-voice');
    });
  });

  describe('Other User Context Menu', () => {
    it('renders all remote participant menu items according to Screenshot 2', () => {
      const onClose = vi.fn();

      render(
        <ParticipantContextMenu
          user={{
            id: 'user-remote',
            username: 'remoteuser',
            displayName: 'Remote User',
            avatar: null,
          }}
          isLocal={false}
          coords={{ x: 200, y: 200 }}
          onClose={onClose}
          onOpenPreview={vi.fn()}
        />,
      );

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Send Message')).toBeInTheDocument();
      expect(screen.getByText('Start Call')).toBeInTheDocument();
      expect(screen.getByText('User Volume')).toBeInTheDocument();
      expect(screen.getByText('Mute')).toBeInTheDocument();
      expect(screen.getByText('Mute Soundboard')).toBeInTheDocument();
      expect(screen.getByText('Follow')).toBeInTheDocument();
      expect(screen.getByText('Block')).toBeInTheDocument();
    });

    it('adjusts user volume from 0 to 200% via the slider', () => {
      const spyUpdate = vi.spyOn(globalSpeakerMixerManager, 'updateProfile');

      render(
        <ParticipantContextMenu
          user={{
            id: 'user-remote',
            username: 'remoteuser',
            displayName: 'Remote User',
            avatar: null,
          }}
          isLocal={false}
          coords={{ x: 200, y: 200 }}
          onClose={vi.fn()}
          onOpenPreview={vi.fn()}
        />,
      );

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '150' } });
      expect(spyUpdate).toHaveBeenCalledWith('user-remote', { volume: 1.5 });

      fireEvent.change(slider, { target: { value: '0' } });
      expect(spyUpdate).toHaveBeenCalledWith('user-remote', { volume: 0 });
    });

    it('triggers follow mutation when Follow is clicked', () => {
      render(
        <ParticipantContextMenu
          user={{
            id: 'user-remote',
            username: 'remoteuser',
            displayName: 'Remote User',
            avatar: null,
          }}
          isLocal={false}
          coords={{ x: 200, y: 200 }}
          onClose={vi.fn()}
          onOpenPreview={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText('Follow'));
      expect(mockFollowMutate).toHaveBeenCalled();
    });

    it('toggles local peer mute for this specific user', () => {
      const spyUpdate = vi.spyOn(globalSpeakerMixerManager, 'updateProfile');

      render(
        <ParticipantContextMenu
          user={{
            id: 'user-remote',
            username: 'remoteuser',
            displayName: 'Remote User',
            avatar: null,
          }}
          isLocal={false}
          coords={{ x: 200, y: 200 }}
          onClose={vi.fn()}
          onOpenPreview={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText('Mute'));
      expect(spyUpdate).toHaveBeenCalledWith('user-remote', { muted: true });
    });

    it('toggles soundboard mute for this specific user', () => {
      const spyUpdate = vi.spyOn(globalSpeakerMixerManager, 'updateProfile');

      render(
        <ParticipantContextMenu
          user={{
            id: 'user-remote',
            username: 'remoteuser',
            displayName: 'Remote User',
            avatar: null,
          }}
          isLocal={false}
          coords={{ x: 200, y: 200 }}
          onClose={vi.fn()}
          onOpenPreview={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText('Mute Soundboard'));
      expect(spyUpdate).toHaveBeenCalledWith('user-remote', { soundboardMuted: true });
    });

    it('ends call in a 1-on-1 private call when "Block" is clicked', () => {
      useCallStore.setState({ remoteStreams: { 'user-remote': {} as any } });

      render(
        <ParticipantContextMenu
          user={{
            id: 'user-remote',
            username: 'remoteuser',
            displayName: 'Remote User',
            avatar: null,
          }}
          isLocal={false}
          coords={{ x: 200, y: 200 }}
          onClose={vi.fn()}
          onOpenPreview={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText('Block'));
      expect(mockEndCall).toHaveBeenCalled();
      expect(mockBlockMutate).toHaveBeenCalledWith('user-remote', expect.any(Object));
    });
  });
});
