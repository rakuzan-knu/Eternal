import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SyncPlayModal } from '../SyncPlayModal';
import { watchTogetherApi } from '../../../api/watchTogetherApi';

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

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'current-user',
      username: 'tester',
      displayName: 'Tester User',
      avatar: 'https://example.com/me.png',
    },
    isLoading: false,
  }),
}));

vi.mock('../../../api/watchTogetherApi', () => ({
  watchTogetherApi: {
    getTrending: vi.fn(),
    search: vi.fn(),
    resolveUrl: vi.fn(),
    recordWatchTime: vi.fn(),
    getHistory: vi.fn(),
    getRecommendations: vi.fn(),
  },
}));

const mockVideos = [
  {
    id: 'vid1',
    title: 'Awesome Song (Official Video)',
    channelTitle: 'Cool Artist',
    thumbnailUrl: 'https://i.ytimg.com/vi/vid1/hqdefault.jpg',
    duration: '4:20',
    durationSec: 260,
    source: 'youtube' as const,
    url: 'https://www.youtube.com/watch?v=vid1',
  },
];

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe('SyncPlayModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
    vi.mocked(watchTogetherApi.getTrending).mockResolvedValue(mockVideos);
    vi.mocked(watchTogetherApi.search).mockResolvedValue({ items: mockVideos });
    vi.mocked(watchTogetherApi.getRecommendations).mockResolvedValue({
      rails: [
        {
          id: 'for-you',
          title: 'Recommended for you',
          subtitle: 'Personal mix',
          icon: 'Sparkles',
          items: mockVideos,
        },
      ],
      hasHistory: false,
    });
  });

  const renderWithClient = (ui: React.ReactElement) =>
    render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

  it('renders Media Hub with header tabs and trending videos', async () => {
    renderWithClient(<SyncPlayModal isOpen={true} engine={null} onClose={vi.fn()} />);

    expect(screen.getByText('Watch Together')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('Direct Link / Stream')).toBeInTheDocument();
    expect(screen.getByText('Room Queue')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Awesome Song (Official Video)')).toBeInTheDocument();
      expect(screen.getByText('Cool Artist')).toBeInTheDocument();
      expect(screen.getByText('4:20')).toBeInTheDocument();
    });
  });

  it('switches tabs between YouTube, Direct Link, and Queue', async () => {
    renderWithClient(<SyncPlayModal isOpen={true} engine={null} onClose={vi.fn()} />);

    const directTab = screen.getByText('Direct Link / Stream');
    fireEvent.click(directTab);
    expect(screen.getByText('Direct Video Stream or Broadcast')).toBeInTheDocument();
    expect(screen.getByText('SSRF Protected & HTTPS Only')).toBeInTheDocument();

    const queueTab = screen.getByText('Room Queue');
    fireEvent.click(queueTab);
    expect(screen.getByText('Room Playback Queue')).toBeInTheDocument();
    expect(screen.getByText('Room queue is empty')).toBeInTheDocument();
  });

  it('adds a video to queue and emits queue_update sync event', async () => {
    renderWithClient(<SyncPlayModal isOpen={true} engine={null} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Awesome Song (Official Video)')).toBeInTheDocument();
    });

    const addQueueButton = screen.getByTitle('Add to room queue');
    fireEvent.click(addQueueButton);

    expect(mockEmit).toHaveBeenCalledWith(
      'watchtogether:sync',
      expect.objectContaining({
        action: 'queue_update',
        queue: expect.arrayContaining([expect.objectContaining({ id: 'vid1' })]),
      }),
    );
  });

  it('transitions to active player when video is launched', async () => {
    renderWithClient(<SyncPlayModal isOpen={true} engine={null} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Awesome Song (Official Video)')).toBeInTheDocument();
    });

    const playBtn = screen.getByText('Play');
    fireEvent.click(playBtn);

    // Checks that player view is active
    await waitFor(() => {
      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });

    expect(mockEmit).toHaveBeenCalledWith(
      'watchtogether:sync',
      expect.objectContaining({
        action: 'activity_start',
        media: expect.objectContaining({ id: 'vid1' }),
      }),
    );
  });
});
