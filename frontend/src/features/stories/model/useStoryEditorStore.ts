import { create } from 'zustand';
import type { StoryMediaType, StoryOverlay, StoryPrivacy } from './types';

interface StoryEditorState {
  isOpen: boolean;
  mediaFile: File | null;
  mediaUrl: string | null;
  mediaType: StoryMediaType;
  caption: string;
  overlays: StoryOverlay[];
  privacy: StoryPrivacy;
  backgroundColor: string;
  activeTool: 'none' | 'text' | 'poll' | 'link' | 'mention' | 'audio';
  editingOverlayId: string | null;

  openEditor: (initialFile?: File, initialUrl?: string, initialType?: StoryMediaType) => void;
  closeEditor: () => void;
  setMedia: (file: File | null, url: string | null, type?: StoryMediaType) => void;
  setCaption: (caption: string) => void;
  addOverlay: (overlay: StoryOverlay) => void;
  updateOverlay: (id: string, updates: Partial<StoryOverlay>) => void;
  removeOverlay: (id: string) => void;
  setPrivacy: (privacy: StoryPrivacy) => void;
  setBackgroundColor: (color: string) => void;
  setActiveTool: (tool: 'none' | 'text' | 'poll' | 'link' | 'mention' | 'audio') => void;
  setEditingOverlayId: (id: string | null) => void;
  reset: () => void;
}

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4c1d95 100%)';

export const useStoryEditorStore = create<StoryEditorState>((set) => ({
  isOpen: false,
  mediaFile: null,
  mediaUrl: null,
  mediaType: 'IMAGE',
  caption: '',
  overlays: [],
  privacy: 'ALL_FOLLOWERS',
  backgroundColor: DEFAULT_GRADIENT,
  activeTool: 'none',
  editingOverlayId: null,

  openEditor: (initialFile, initialUrl, initialType = 'IMAGE') => {
    set({
      isOpen: true,
      mediaFile: initialFile ?? null,
      mediaUrl: initialUrl ?? null,
      mediaType: initialType,
      caption: '',
      overlays: [],
      privacy: 'ALL_FOLLOWERS',
      backgroundColor: DEFAULT_GRADIENT,
      activeTool: 'none',
      editingOverlayId: null,
    });
  },

  closeEditor: () => {
    set({
      isOpen: false,
      mediaFile: null,
      mediaUrl: null,
      overlays: [],
      activeTool: 'none',
      editingOverlayId: null,
    });
  },

  setMedia: (file, url, type = 'IMAGE') => {
    set({
      mediaFile: file,
      mediaUrl: url,
      mediaType: type,
    });
  },

  setCaption: (caption) => set({ caption }),

  addOverlay: (overlay) =>
    set((state) => ({
      overlays: [...state.overlays, overlay],
      activeTool: 'none',
      editingOverlayId: null,
    })),

  updateOverlay: (id, updates) =>
    set((state) => ({
      overlays: state.overlays.map((o) =>
        o.id === id ? ({ ...o, ...updates } as StoryOverlay) : o,
      ),
    })),

  removeOverlay: (id) =>
    set((state) => ({
      overlays: state.overlays.filter((o) => o.id !== id),
      editingOverlayId: state.editingOverlayId === id ? null : state.editingOverlayId,
    })),

  setPrivacy: (privacy) => set({ privacy }),
  setBackgroundColor: (backgroundColor) => set({ backgroundColor }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setEditingOverlayId: (editingOverlayId) => set({ editingOverlayId }),

  reset: () =>
    set({
      isOpen: false,
      mediaFile: null,
      mediaUrl: null,
      mediaType: 'IMAGE',
      caption: '',
      overlays: [],
      privacy: 'ALL_FOLLOWERS',
      backgroundColor: DEFAULT_GRADIENT,
      activeTool: 'none',
      editingOverlayId: null,
    }),
}));
