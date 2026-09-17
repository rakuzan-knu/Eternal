import { create } from 'zustand';
import { registerSessionResetHandler } from '@/shared/model/resetSession';
import type { ImageOverlay, StoryMediaType, StoryOverlay, StoryPrivacy } from './types';
import { GRADIENT_PRESETS } from '../lib/storyCanvasUtils';

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
  selectedOverlayId: string | null;
  isDraggingOverTrash: boolean;
  activeFilter: string;
  isFiltersOpen: boolean;
  isMusicModalOpen: boolean;
  isEmojiPickerOpen: boolean;
  isDrawingMode: boolean;
  videoVolume: number;
  musicVolume: number;

  openEditor: (initialFile?: File, initialUrl?: string, initialType?: StoryMediaType) => void;
  closeEditor: () => void;
  setMedia: (file: File | null, url: string | null, type?: StoryMediaType) => void;
  setCaption: (caption: string) => void;
  addOverlay: (overlay: StoryOverlay) => void;
  updateOverlay: (id: string, updates: Partial<StoryOverlay>) => void;
  removeOverlay: (id: string) => void;
  bringToFront: (id: string) => void;
  setSelectedOverlayId: (id: string | null) => void;
  setIsDraggingOverTrash: (val: boolean) => void;
  setPrivacy: (privacy: StoryPrivacy) => void;
  setBackgroundColor: (color: string) => void;
  setActiveTool: (tool: 'none' | 'text' | 'poll' | 'link' | 'mention' | 'audio') => void;
  setEditingOverlayId: (id: string | null) => void;
  setActiveFilter: (filter: string) => void;
  setIsFiltersOpen: (isOpen: boolean) => void;
  setIsMusicModalOpen: (isOpen: boolean) => void;
  setIsEmojiPickerOpen: (isOpen: boolean) => void;
  setIsDrawingMode: (isDrawing: boolean) => void;
  setAudioBalance: (videoVolume: number, musicVolume: number) => void;
  setAudioVolumes: (videoVolume: number, musicVolume: number) => void;
  reset: () => void;
}

const DEFAULT_GRADIENT = GRADIENT_PRESETS[0];

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
  selectedOverlayId: null,
  isDraggingOverTrash: false,
  activeFilter: 'none',
  isFiltersOpen: false,
  isMusicModalOpen: false,
  isEmojiPickerOpen: false,
  isDrawingMode: false,
  videoVolume: 1,
  musicVolume: 1,

  openEditor: (initialFile, initialUrl, initialType = 'IMAGE') => {
    const initialOverlays: StoryOverlay[] = [];
    if (initialUrl && initialType === 'IMAGE') {
      initialOverlays.push({
        id: 'main-media',
        type: 'image',
        url: initialUrl,
        isMainMedia: true,
        xPercent: 50,
        yPercent: 50,
        scale: 1,
        rotation: 0,
        zIndex: 1,
      });
    }

    set({
      isOpen: true,
      mediaFile: initialFile ?? null,
      mediaUrl: initialUrl ?? null,
      mediaType: initialType,
      caption: '',
      overlays: initialOverlays,
      privacy: 'ALL_FOLLOWERS',
      backgroundColor: DEFAULT_GRADIENT,
      activeTool: 'none',
      editingOverlayId: null,
      selectedOverlayId: initialOverlays[0]?.id ?? null,
      isDraggingOverTrash: false,
      activeFilter: 'none',
      isFiltersOpen: false,
      isMusicModalOpen: false,
      isEmojiPickerOpen: false,
      isDrawingMode: false,
      videoVolume: 1,
      musicVolume: 1,
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
      selectedOverlayId: null,
      isDraggingOverTrash: false,
      activeFilter: 'none',
      isFiltersOpen: false,
      isMusicModalOpen: false,
      isEmojiPickerOpen: false,
      isDrawingMode: false,
      videoVolume: 1,
      musicVolume: 1,
    });
  },

  setMedia: (file, url, type = 'IMAGE') => {
    set((state) => {
      let nextOverlays = [...state.overlays];
      if (url && type === 'IMAGE') {
        const existingMainIndex = nextOverlays.findIndex(
          (o) => o.type === 'image' && (o as ImageOverlay).isMainMedia,
        );
        if (existingMainIndex >= 0) {
          nextOverlays[existingMainIndex] = {
            ...nextOverlays[existingMainIndex],
            url,
          } as ImageOverlay;
        } else {
          const mainOverlay: ImageOverlay = {
            id: 'main-media',
            type: 'image',
            url,
            isMainMedia: true,
            xPercent: 50,
            yPercent: 50,
            scale: 1,
            rotation: 0,
            zIndex: 1,
          };
          nextOverlays = [mainOverlay, ...nextOverlays];
        }
      } else if (!url) {
        nextOverlays = nextOverlays.filter(
          (o) => !(o.type === 'image' && (o as ImageOverlay).isMainMedia),
        );
      }

      return {
        mediaFile: file,
        mediaUrl: url,
        mediaType: type,
        overlays: nextOverlays,
        selectedOverlayId: url && type === 'IMAGE' ? 'main-media' : state.selectedOverlayId,
      };
    });
  },

  setCaption: (caption) => set({ caption }),

  addOverlay: (overlay) =>
    set((state) => {
      const maxZ = state.overlays.reduce((max, o) => Math.max(max, o.zIndex ?? 1), 1);
      const overlayWithZ = { ...overlay, zIndex: maxZ + 1 };
      return {
        overlays: [...state.overlays, overlayWithZ],
        activeTool: 'none',
        editingOverlayId: null,
        selectedOverlayId: overlay.id,
      };
    }),

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
      selectedOverlayId: state.selectedOverlayId === id ? null : state.selectedOverlayId,
    })),

  bringToFront: (id) =>
    set((state) => {
      const maxZ = state.overlays.reduce((max, o) => Math.max(max, o.zIndex ?? 1), 1);
      const target = state.overlays.find((o) => o.id === id);
      if (!target) return state;

      const updated = state.overlays.map((o) =>
        o.id === id ? ({ ...o, zIndex: maxZ + 1 } as StoryOverlay) : o,
      );
      // Move target to end for natural DOM stacking order
      const nonTarget = updated.filter((o) => o.id !== id);
      const targetElem = updated.find((o) => o.id === id);
      return {
        overlays: targetElem ? [...nonTarget, targetElem] : updated,
        selectedOverlayId: id,
      };
    }),

  setSelectedOverlayId: (selectedOverlayId) => set({ selectedOverlayId }),
  setIsDraggingOverTrash: (isDraggingOverTrash) => set({ isDraggingOverTrash }),
  setPrivacy: (privacy) => set({ privacy }),
  setBackgroundColor: (backgroundColor) => set({ backgroundColor }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setEditingOverlayId: (editingOverlayId) => set({ editingOverlayId }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  setIsFiltersOpen: (isFiltersOpen) => set({ isFiltersOpen }),
  setIsMusicModalOpen: (isMusicModalOpen) => set({ isMusicModalOpen }),
  setIsEmojiPickerOpen: (isEmojiPickerOpen) => set({ isEmojiPickerOpen }),
  setIsDrawingMode: (isDrawingMode) => set({ isDrawingMode }),
  setAudioBalance: (videoVolume, musicVolume) => set({ videoVolume, musicVolume }),
  setAudioVolumes: (videoVolume, musicVolume) => set({ videoVolume, musicVolume }),

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
      selectedOverlayId: null,
      isDraggingOverTrash: false,
      activeFilter: 'none',
      isFiltersOpen: false,
      isMusicModalOpen: false,
      isEmojiPickerOpen: false,
      isDrawingMode: false,
      videoVolume: 1,
      musicVolume: 1,
    }),
}));

/** RESET_STORES: discard unsent story composition on logout/switch. */
registerSessionResetHandler(() => {
  useStoryEditorStore.getState().reset();
});
