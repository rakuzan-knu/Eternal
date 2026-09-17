import { create } from 'zustand';
import { registerSessionResetHandler } from '@/shared/model/resetSession';
import type { UserStoriesGroup } from './types';

interface StoryViewerState {
  isOpen: boolean;
  activeGroupIndex: number;
  activeStoryIndex: number;
  groups: UserStoriesGroup[];
  isPaused: boolean;
  isBuffering: boolean;
  isMuted: boolean;
  volume: number;
  isInputFocused: boolean;
  isMenuOpen: boolean;
  isVolumeHovered: boolean;
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
  setVolume: (volume: number) => void;
  setInputFocused: (isFocused: boolean) => void;
  setMenuOpen: (isOpen: boolean) => void;
  setVolumeHovered: (isHovered: boolean) => void;
  setVideoProgress: (progress: number) => void;
  setGroups: (groups: UserStoriesGroup[]) => void;
  removeStory: (storyId: string) => void;
  markStoryViewed: (storyId: string) => void;
}

const getInitialMuted = (): boolean => {
  try {
    const saved = localStorage.getItem('story_viewer_muted');
    return saved !== null ? saved === 'true' : true;
  } catch {
    return true;
  }
};

const getInitialVolume = (): number => {
  try {
    const saved = localStorage.getItem('story_viewer_volume');
    return saved !== null ? parseFloat(saved) : 1;
  } catch {
    return 1;
  }
};

export const useStoryViewerStore = create<StoryViewerState>((set, get) => ({
  isOpen: false,
  activeGroupIndex: 0,
  activeStoryIndex: 0,
  groups: [],
  isPaused: false,
  isBuffering: false,
  isMuted: getInitialMuted(),
  volume: getInitialVolume(),
  isInputFocused: false,
  isMenuOpen: false,
  isVolumeHovered: false,
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
      isInputFocused: false,
      isMenuOpen: false,
      isVolumeHovered: false,
      videoProgress: 0,
    });
  },

  closeViewer: () => {
    set({
      isOpen: false,
      isPaused: false,
      isBuffering: false,
      isInputFocused: false,
      isMenuOpen: false,
      isVolumeHovered: false,
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
  setInputFocused: (isInputFocused) => set({ isInputFocused }),
  setMenuOpen: (isMenuOpen) => set({ isMenuOpen }),
  setVolumeHovered: (isVolumeHovered) => set({ isVolumeHovered }),

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    try {
      localStorage.setItem('story_viewer_muted', String(nextMuted));
    } catch {}
    set({ isMuted: nextMuted });
  },

  setMuted: (isMuted) => {
    try {
      localStorage.setItem('story_viewer_muted', String(isMuted));
    } catch {}
    set({ isMuted });
  },

  setVolume: (volume) => {
    const clamped = Math.max(0, Math.min(1, volume));
    try {
      localStorage.setItem('story_viewer_volume', String(clamped));
      if (clamped > 0 && get().isMuted) {
        localStorage.setItem('story_viewer_muted', 'false');
        set({ volume: clamped, isMuted: false });
        return;
      }
    } catch {}
    set({ volume: clamped });
  },

  setVideoProgress: (videoProgress) => set({ videoProgress }),
  setGroups: (groups) => set({ groups }),

  removeStory: (storyId: string) => {
    const { groups, activeGroupIndex, activeStoryIndex } = get();
    if (!groups || groups.length === 0) return;

    let targetGroupIdx = -1;
    for (let g = 0; g < groups.length; g++) {
      if (groups[g].stories.some((s) => s.id === storyId)) {
        targetGroupIdx = g;
        break;
      }
    }

    if (targetGroupIdx === -1) return;

    const targetGroup = groups[targetGroupIdx];
    const remainingStories = targetGroup.stories.filter((s) => s.id !== storyId);

    if (remainingStories.length === 0) {
      // Group has no more stories left -> remove group from groups
      const remainingGroups = groups.filter((_, idx) => idx !== targetGroupIdx);

      if (remainingGroups.length === 0) {
        // Zero stories left across all groups -> close viewer immediately
        get().closeViewer();
        return;
      }

      let nextGroupIdx = activeGroupIndex;
      if (targetGroupIdx === activeGroupIndex) {
        nextGroupIdx = Math.min(activeGroupIndex, remainingGroups.length - 1);
      } else if (targetGroupIdx < activeGroupIndex) {
        nextGroupIdx = activeGroupIndex - 1;
      }

      set({
        groups: remainingGroups,
        activeGroupIndex: nextGroupIdx,
        activeStoryIndex: 0,
        videoProgress: 0,
        isBuffering: false,
      });
    } else {
      // Group still has remaining stories
      const updatedGroups = [...groups];
      const hasUnviewed = remainingStories.some((s) => !s.hasViewed);
      updatedGroups[targetGroupIdx] = {
        ...targetGroup,
        stories: remainingStories,
        hasUnviewed,
      };

      let nextStoryIdx = activeStoryIndex;
      if (targetGroupIdx === activeGroupIndex) {
        nextStoryIdx = Math.min(activeStoryIndex, remainingStories.length - 1);
      }

      set({
        groups: updatedGroups,
        activeStoryIndex: nextStoryIdx,
        videoProgress: 0,
        isBuffering: false,
      });
    }
  },

  markStoryViewed: (storyId: string) => {
    const { groups } = get();
    const updated = groups.map((group) => {
      const storyIdx = group.stories.findIndex((s) => s.id === storyId);
      if (storyIdx === -1) return group;

      const newStories = [...group.stories];
      newStories[storyIdx] = {
        ...newStories[storyIdx],
        hasViewed: true,
      };
      const hasUnviewed = newStories.some((s) => !s.hasViewed);
      return {
        ...group,
        stories: newStories,
        hasUnviewed,
      };
    });
    set({ groups: updated });
  },
}));

/**
 * RESET_STORES: close viewer + drop cached groups on logout/switch.
 * Device prefs (muted/volume) are preserved.
 */
registerSessionResetHandler(() => {
  useStoryViewerStore.setState({
    isOpen: false,
    activeGroupIndex: 0,
    activeStoryIndex: 0,
    groups: [],
    isPaused: false,
    isBuffering: false,
    isInputFocused: false,
    isMenuOpen: false,
    isVolumeHovered: false,
    videoProgress: 0,
  });
});
