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

  it('manages mute, pause, volume, input focus and buffering states', () => {
    const store = useStoryViewerStore.getState();
    expect(typeof store.isMuted).toBe('boolean');

    useStoryViewerStore.getState().toggleMute();
    expect(useStoryViewerStore.getState().isMuted).toBe(false);

    useStoryViewerStore.getState().setVolume(0.75);
    expect(useStoryViewerStore.getState().volume).toBe(0.75);

    useStoryViewerStore.getState().setInputFocused(true);
    expect(useStoryViewerStore.getState().isInputFocused).toBe(true);

    useStoryViewerStore.getState().setMenuOpen(true);
    expect(useStoryViewerStore.getState().isMenuOpen).toBe(true);

    useStoryViewerStore.getState().setVolumeHovered(true);
    expect(useStoryViewerStore.getState().isVolumeHovered).toBe(true);

    useStoryViewerStore.getState().setPaused(true);
    expect(useStoryViewerStore.getState().isPaused).toBe(true);

    useStoryViewerStore.getState().setBuffering(true);
    expect(useStoryViewerStore.getState().isBuffering).toBe(true);
  });

  it('marks story as viewed and updates group unviewed flag', () => {
    useStoryViewerStore.getState().openViewer(mockGroups, 0, 1);
    expect(useStoryViewerStore.getState().groups[0].hasUnviewed).toBe(true);

    useStoryViewerStore.getState().markStoryViewed('s-2');
    const group0 = useStoryViewerStore.getState().groups[0];
    expect(group0.stories.find((s) => s.id === 's-2')?.hasViewed).toBe(true);
    expect(group0.hasUnviewed).toBe(false);
  });

  it('removes story from group and clamps story index', () => {
    useStoryViewerStore.getState().openViewer(mockGroups, 0, 1);
    expect(useStoryViewerStore.getState().groups[0].stories.length).toBe(2);

    useStoryViewerStore.getState().removeStory('s-2');
    const state = useStoryViewerStore.getState();
    expect(state.groups[0].stories.length).toBe(1);
    expect(state.groups[0].stories[0].id).toBe('s-1');
    expect(state.activeStoryIndex).toBe(0);
  });

  it('removes group and closes viewer if last story in single group is removed', () => {
    const singleGroup = [mockGroups[1]]; // only bob with 1 story
    useStoryViewerStore.getState().openViewer(singleGroup, 0, 0);
    expect(useStoryViewerStore.getState().isOpen).toBe(true);

    useStoryViewerStore.getState().removeStory('s-3');
    expect(useStoryViewerStore.getState().isOpen).toBe(false);
  });

  it('removes group and transitions to next group when all stories in a group are removed', () => {
    useStoryViewerStore.getState().openViewer(mockGroups, 1, 0); // focused on bob (group 1)
    expect(useStoryViewerStore.getState().activeGroupIndex).toBe(1);

    useStoryViewerStore.getState().removeStory('s-3'); // bob's only story
    const state = useStoryViewerStore.getState();
    expect(state.groups.length).toBe(1);
    expect(state.groups[0].user.username).toBe('alice');
    expect(state.activeGroupIndex).toBe(0);
  });
});
