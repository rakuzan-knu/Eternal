import { describe, it, expect, beforeEach } from 'vitest';
import { useStoryViewerStore } from '../useStoryViewerStore';
import type { UserStoriesGroup } from '../types';

describe('useStoryViewerStore', () => {
  const mockGroups: UserStoriesGroup[] = [
    {
      user: { id: 'u-1', username: 'alice', displayName: 'Alice', avatar: null },
      hasUnviewed: true,
      hasCloseFriendsStory: false,
      latestStoryTimestamp: new Date().toISOString(),
      stories: [
        {
          id: 's-1',
          authorId: 'u-1',
          mediaUrl: 'https://example.com/1.jpg',
          mediaType: 'IMAGE',
          caption: null,
          overlays: null,
          privacy: 'ALL_FOLLOWERS',
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
          viewsCount: 5,
          hasViewed: true,
          userReaction: null,
          reactionsCount: {},
          pollResult: null,
          author: { id: 'u-1', username: 'alice', displayName: 'Alice', avatar: null },
        },
        {
          id: 's-2',
          authorId: 'u-1',
          mediaUrl: 'https://example.com/2.jpg',
          mediaType: 'IMAGE',
          caption: null,
          overlays: null,
          privacy: 'ALL_FOLLOWERS',
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
          viewsCount: 2,
          hasViewed: false,
          userReaction: null,
          reactionsCount: {},
          pollResult: null,
          author: { id: 'u-1', username: 'alice', displayName: 'Alice', avatar: null },
        },
      ],
    },
    {
      user: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
      hasUnviewed: false,
      hasCloseFriendsStory: false,
      latestStoryTimestamp: new Date().toISOString(),
      stories: [
        {
          id: 's-3',
          authorId: 'u-2',
          mediaUrl: 'https://example.com/3.jpg',
          mediaType: 'IMAGE',
          caption: null,
          overlays: null,
          privacy: 'ALL_FOLLOWERS',
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
          viewsCount: 1,
          hasViewed: true,
          userReaction: null,
          reactionsCount: {},
          pollResult: null,
          author: { id: 'u-2', username: 'bob', displayName: 'Bob', avatar: null },
        },
      ],
    },
  ];

  beforeEach(() => {
    useStoryViewerStore.getState().closeViewer();
  });

  it('opens viewer and automatically selects first unviewed story', () => {
    useStoryViewerStore.getState().openViewer(mockGroups, 0, 0);
    const state = useStoryViewerStore.getState();

    expect(state.isOpen).toBe(true);
    expect(state.activeGroupIndex).toBe(0);
    expect(state.activeStoryIndex).toBe(1); // s-2 was unviewed
  });

  it('navigates next and previous stories and groups correctly', () => {
    useStoryViewerStore.getState().openViewer(mockGroups, 0, 0);

    // active is group 0, story 1 (last story in group 0)
    useStoryViewerStore.getState().nextStory();
    let state = useStoryViewerStore.getState();
    expect(state.activeGroupIndex).toBe(1);
    expect(state.activeStoryIndex).toBe(0);

    // Step back to previous group
    useStoryViewerStore.getState().prevStory();
    state = useStoryViewerStore.getState();
    expect(state.activeGroupIndex).toBe(0);
    expect(state.activeStoryIndex).toBe(1);
  });

  it('closes viewer on reaching end of all groups', () => {
    useStoryViewerStore.getState().openViewer(mockGroups, 1, 0);
    useStoryViewerStore.getState().nextStory();

    expect(useStoryViewerStore.getState().isOpen).toBe(false);
  });

  it('manages mute, pause and buffering states', () => {
    const store = useStoryViewerStore.getState();
    expect(store.isMuted).toBe(true);

    useStoryViewerStore.getState().toggleMute();
    expect(useStoryViewerStore.getState().isMuted).toBe(false);

    useStoryViewerStore.getState().setPaused(true);
    expect(useStoryViewerStore.getState().isPaused).toBe(true);

    useStoryViewerStore.getState().setBuffering(true);
    expect(useStoryViewerStore.getState().isBuffering).toBe(true);
  });
});
