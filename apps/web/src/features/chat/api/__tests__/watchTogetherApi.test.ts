import { describe, it, expect, vi, beforeEach } from 'vitest';
import { watchTogetherApi } from '../watchTogetherApi';
import { apiClient } from '@/shared/api/httpClient';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('watchTogetherApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches trending videos with default regionCode US', async () => {
    const mockTrending = [
      {
        id: 'vid1',
        title: 'Trending Video 1',
        channelTitle: 'Channel 1',
        thumbnailUrl: 'https://i.ytimg.com/vi/vid1/hqdefault.jpg',
        duration: '10:00',
        durationSec: 600,
        source: 'youtube' as const,
        url: 'https://www.youtube.com/watch?v=vid1',
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockTrending });

    const res = await watchTogetherApi.getTrending();
    expect(apiClient.get).toHaveBeenCalledWith('/watch-together/youtube/trending', {
      params: { regionCode: 'US' },
    });
    expect(res).toEqual(mockTrending);
  });

  it('searches videos with query', async () => {
    const mockSearchResponse = {
      items: [
        {
          id: 'vid2',
          title: 'Search Result',
          channelTitle: 'Channel 2',
          thumbnailUrl: 'https://i.ytimg.com/vi/vid2/hqdefault.jpg',
          duration: '3:30',
          durationSec: 210,
          source: 'youtube' as const,
          url: 'https://www.youtube.com/watch?v=vid2',
        },
      ],
      nextPageToken: 'token123',
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockSearchResponse });

    const res = await watchTogetherApi.search('lofi beats', 'token123');
    expect(apiClient.get).toHaveBeenCalledWith('/watch-together/youtube/search', {
      params: { q: 'lofi beats', pageToken: 'token123' },
    });
    expect(res).toEqual(mockSearchResponse);
  });

  it('resolves URL safely via backend endpoint', async () => {
    const mockResolved = {
      type: 'direct' as const,
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      title: 'BigBuckBunny.mp4',
      thumbnailUrl: '',
      durationSec: 596,
      duration: '9:56',
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResolved });

    const res = await watchTogetherApi.resolveUrl(
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    );
    expect(apiClient.post).toHaveBeenCalledWith('/watch-together/resolve-url', {
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    });
    expect(res).toEqual(mockResolved);
  });

  it('records user watch time engagement via POST /watch-together/history/record', async () => {
    const mockResponse = { recorded: true, category: 'gaming', watchFactor: 1.5 };
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResponse });

    const payload = {
      videoId: 'game_vid_1',
      title: 'Elden Ring Boss Fight',
      channelTitle: 'GamerGuy',
      durationSec: 600,
      watchedSec: 120,
    };
    const res = await watchTogetherApi.recordWatchTime(payload);
    expect(apiClient.post).toHaveBeenCalledWith('/watch-together/history/record', payload);
    expect(res).toEqual(mockResponse);
  });

  it('fetches personalized recommendation rails via GET /watch-together/recommendations/rails', async () => {
    const mockRails = {
      rails: [
        {
          id: 'for-you',
          title: 'Recommended for you',
          items: [],
        },
      ],
      hasHistory: true,
    };
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockRails });

    const res = await watchTogetherApi.getRecommendations();
    expect(apiClient.get).toHaveBeenCalledWith('/watch-together/recommendations/rails');
    expect(res).toEqual(mockRails);
  });

  it('fetches watch history via GET /watch-together/history', async () => {
    const mockHistory = [
      {
        id: 'vid1',
        title: 'Watched Video',
        channelTitle: 'Creator',
        thumbnailUrl: '',
        duration: '5:00',
        durationSec: 300,
        watchedSec: 150,
        progress: 0.5,
        watchedAt: Date.now(),
        source: 'youtube' as const,
        url: 'https://youtube.com/watch?v=vid1',
      },
    ];
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockHistory });

    const res = await watchTogetherApi.getHistory();
    expect(apiClient.get).toHaveBeenCalledWith('/watch-together/history');
    expect(res).toEqual(mockHistory);
  });
});
