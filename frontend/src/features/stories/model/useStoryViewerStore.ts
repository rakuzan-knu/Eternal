import { create } from 'zustand';
import type { UserStoriesGroup } from './types';

interface StoryViewerState {
  isOpen: boolean;
  activeGroupIndex: number;
  activeStoryIndex: number;
  groups: UserStoriesGroup[];
  isPaused: boolean;
  isBuffering: boolean;
  isMuted: boolean;
  videoProgress: number;

  openViewer: (groups: UserStoriesGroup[], groupIndex?: number, storyIndex?: number) => void;
  closeViewer: () => void;
  nextStory: () => void;
  prevStory: () => void;
  setGroupAndStory: (groupIndex: number, storyIndex: number) => void;
  setPaused: (isPaused: boolean) => void;
  setBuffering: (isBuffering: boolean) => void;
  toggleMute: () => void;
  setMuted: (isMuted: boolean) => void;
  setVideoProgress: (progress: number) => void;
  setGroups: (groups: UserStoriesGroup[]) => void;
}

export const useStoryViewerStore = create<StoryViewerState>((set, get) => ({
  isOpen: false,
  activeGroupIndex: 0,
  activeStoryIndex: 0,
  groups: [],
  isPaused: false,
  isBuffering: false,
  isMuted: true, // Default muted for browser autoplay compliance
  videoProgress: 0,

  openViewer: (groups, groupIndex = 0, storyIndex = 0) => {
    const validGroupIndex = Math.max(0, Math.min(groupIndex, groups.length - 1));
    const targetGroup = groups[validGroupIndex];
    let resolvedStoryIndex = storyIndex;

    // If starting a user's group and storyIndex is 0, start at first unviewed story if any
    if (storyIndex === 0 && targetGroup && targetGroup.stories.length > 0) {
      const firstUnviewed = targetGroup.stories.findIndex((s) => !s.hasViewed);
      if (firstUnviewed !== -1) {
        resolvedStoryIndex = firstUnviewed;
      }
    }

    set({
      isOpen: true,
      groups,
      activeGroupIndex: validGroupIndex,
      activeStoryIndex: resolvedStoryIndex,
      isPaused: false,
      isBuffering: false,
      videoProgress: 0,
    });
  },

  closeViewer: () => {
    set({
      isOpen: false,
      isPaused: false,
      isBuffering: false,
      videoProgress: 0,
    });
  },

  nextStory: () => {
    const { groups, activeGroupIndex, activeStoryIndex } = get();
    const currentGroup = groups[activeGroupIndex];
    if (!currentGroup) return;

    if (activeStoryIndex < currentGroup.stories.length - 1) {
      set({
        activeStoryIndex: activeStoryIndex + 1,
        videoProgress: 0,
        isBuffering: false,
      });
    } else if (activeGroupIndex < groups.length - 1) {
      set({
        activeGroupIndex: activeGroupIndex + 1,
        activeStoryIndex: 0,
        videoProgress: 0,
        isBuffering: false,
      });
    } else {
      get().closeViewer();
    }
  },

  prevStory: () => {
    const { groups, activeGroupIndex, activeStoryIndex } = get();

    if (activeStoryIndex > 0) {
      set({
        activeStoryIndex: activeStoryIndex - 1,
        videoProgress: 0,
        isBuffering: false,
      });
    } else if (activeGroupIndex > 0) {
      const prevGroup = groups[activeGroupIndex - 1];
      set({
        activeGroupIndex: activeGroupIndex - 1,
        activeStoryIndex: prevGroup ? Math.max(0, prevGroup.stories.length - 1) : 0,
        videoProgress: 0,
        isBuffering: false,
      });
    }
  },

  setGroupAndStory: (groupIndex, storyIndex) => {
    set({
      activeGroupIndex: groupIndex,
      activeStoryIndex: storyIndex,
      videoProgress: 0,
      isBuffering: false,
    });
  },

  setPaused: (isPaused) => set({ isPaused }),
  setBuffering: (isBuffering) => set({ isBuffering }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setMuted: (isMuted) => set({ isMuted }),
  setVideoProgress: (videoProgress) => set({ videoProgress }),
  setGroups: (groups) => set({ groups }),
}));
