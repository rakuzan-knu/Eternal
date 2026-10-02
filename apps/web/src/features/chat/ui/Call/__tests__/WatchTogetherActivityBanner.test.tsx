import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WatchTogetherActivityBanner } from '../WatchTogetherActivityBanner';
import { useWatchTogetherStore } from '../../../model/useWatchTogetherStore';
import { useCallStore } from '../../../model/callStore';
import { useAuthStore } from '@/shared/model/useAuthStore';

const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock('@/shared/api/socket', () => ({
  getSocket: () => ({
    emit: mockEmit,
    on: mockOn,
    off: mockOff,
  }),
}));

describe('WatchTogetherActivityBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWatchTogetherStore.getState().resetAll();
    useAuthStore.setState({ userId: 'user_1' });
    useCallStore.setState({ isSyncPlayOpen: false });
  });

  it('does not render when there is no active activity', () => {
    const { container } = render(<WatchTogetherActivityBanner conversationId="conv_1" />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render for the initiator themselves', () => {
    useWatchTogetherStore.getState().setActiveActivity({
      conversationId: 'conv_1',
      initiatorId: 'user_1', // current user is initiator
      initiatorName: 'Me',
      initiatorAvatar: null,
      media: {
        id: 'vid1',
        title: 'Cyberpunk 2077 Trailer',
        channelTitle: 'CDPR',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        duration: '2:15',
        durationSec: 135,
        source: 'youtube',
        url: 'https://youtube.com/watch?v=vid1',
      },
      timestamp: 10,
      isPlaying: true,
    });

    const { container } = render(<WatchTogetherActivityBanner conversationId="conv_1" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders invitation banner for other participants', () => {
    useWatchTogetherStore.getState().setActiveActivity({
      conversationId: 'conv_1',
      initiatorId: 'user_2', // another user started it
      initiatorName: 'Alice',
      initiatorAvatar: 'https://example.com/alice.jpg',
      media: {
        id: 'vid1',
        title: 'Cyberpunk 2077 Trailer',
        channelTitle: 'CDPR',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        duration: '2:15',
        durationSec: 135,
        source: 'youtube',
        url: 'https://youtube.com/watch?v=vid1',
      },
      timestamp: 42,
      isPlaying: true,
    });

    render(<WatchTogetherActivityBanner conversationId="conv_1" />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('started watching video together')).toBeInTheDocument();
    expect(screen.getByText('Cyberpunk 2077 Trailer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
  });

  it('dismisses banner when close button is clicked', () => {
    useWatchTogetherStore.getState().setActiveActivity({
      conversationId: 'conv_1',
      initiatorId: 'user_2',
      initiatorName: 'Alice',
      initiatorAvatar: null,
      media: {
        id: 'vid1',
        title: 'Cyberpunk 2077 Trailer',
        channelTitle: 'CDPR',
        thumbnailUrl: '',
        duration: '2:15',
        durationSec: 135,
        source: 'youtube',
        url: 'https://youtube.com/watch?v=vid1',
      },
      timestamp: 15,
      isPlaying: true,
    });

    const { rerender } = render(<WatchTogetherActivityBanner conversationId="conv_1" />);

    const closeBtn = screen.getByTitle('Close');
    fireEvent.click(closeBtn);

    rerender(<WatchTogetherActivityBanner conversationId="conv_1" />);
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('joins session when Join button is clicked', () => {
    useWatchTogetherStore.getState().setActiveActivity({
      conversationId: 'conv_1',
      initiatorId: 'user_2',
      initiatorName: 'Alice',
      initiatorAvatar: null,
      media: {
        id: 'vid1',
        title: 'Cyberpunk 2077 Trailer',
        channelTitle: 'CDPR',
        thumbnailUrl: '',
        duration: '2:15',
        durationSec: 135,
        source: 'youtube',
        url: 'https://youtube.com/watch?v=vid1',
      },
      timestamp: 55,
      isPlaying: true,
    });

    render(<WatchTogetherActivityBanner conversationId="conv_1" />);

    const joinBtn = screen.getByRole('button', { name: /join/i });
    fireEvent.click(joinBtn);

    expect(useCallStore.getState().isSyncPlayOpen).toBe(true);
    expect(useWatchTogetherStore.getState().activeMedia?.id).toBe('vid1');
    expect(useWatchTogetherStore.getState().currentTime).toBe(55);
    expect(useWatchTogetherStore.getState().isPlaying).toBe(true);
  });
});
