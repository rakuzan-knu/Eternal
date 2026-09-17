import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storiesApi } from '../storiesApi';
import { apiClient } from '@/shared/api/httpClient';

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('storiesApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getFeed and getUserStories', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: [{ user: { id: 'u1', username: 'u1', displayName: 'U1', avatar: null }, stories: [] }],
    });
    const feed = await storiesApi.getFeed();
    expect(apiClient.get).toHaveBeenCalledWith('/stories/feed');
    expect(feed).toHaveLength(1);

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: { user: { id: 'u2', username: 'u2', displayName: 'U2', avatar: null }, stories: [] },
    });
    const userStories = await storiesApi.getUserStories('u2');
    expect(apiClient.get).toHaveBeenCalledWith('/stories/user/u2');
    expect(userStories?.user.id).toBe('u2');
  });

  it('calls createStory with FormData', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { id: 'story-1' } });
    const file = new File(['content'], 'story.jpg', { type: 'image/jpeg' });
    const result = await storiesApi.createStory({
      file,
      mediaType: 'IMAGE',
      caption: 'Nice day',
      overlays: [{ type: 'text', text: 'Hello' } as any],
      privacy: 'ALL_FOLLOWERS',
      backgroundColor: '#000000',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/stories', expect.any(FormData), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    expect(result).toEqual({ id: 'story-1' });
  });

  it('calls viewStory, reactToStory, votePoll, replyToStory, getStoryViewers, deleteStory, getCloseFriends, toggleCloseFriend', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } });
    vi.mocked(apiClient.get).mockResolvedValue({ data: { viewers: [] } });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: null });

    await storiesApi.viewStory('s1');
    expect(apiClient.post).toHaveBeenCalledWith('/stories/s1/view');

    await storiesApi.reactToStory('s1', '🔥');
    expect(apiClient.post).toHaveBeenCalledWith('/stories/s1/react', { emoji: '🔥' });

    await storiesApi.votePoll('s1', 1);
    expect(apiClient.post).toHaveBeenCalledWith('/stories/s1/poll-vote', { optionIndex: 1 });

    await storiesApi.replyToStory('s1', 'Great story!');
    expect(apiClient.post).toHaveBeenCalledWith('/stories/s1/reply', { text: 'Great story!' });

    await storiesApi.getStoryViewers('s1');
    expect(apiClient.get).toHaveBeenCalledWith('/stories/s1/viewers');

    await storiesApi.deleteStory('s1');
    expect(apiClient.delete).toHaveBeenCalledWith('/stories/s1');

    await storiesApi.getCloseFriends();
    expect(apiClient.get).toHaveBeenCalledWith('/stories/close-friends/list');

    await storiesApi.toggleCloseFriend('u-friend-1');
    expect(apiClient.post).toHaveBeenCalledWith('/stories/close-friends/u-friend-1');
  });
});
