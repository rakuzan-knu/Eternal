import { create } from 'zustand';
import type { ShowcaseMediaType } from '@backend/common/contracts';

export interface MediaModalItem {
  id?: string;
  type: ShowcaseMediaType;
  title: string;
  posterUrl: string;
  subtitle?: string | null;
  rating?: number | null;
  releaseYear?: number | null;
  tags?: string[];
  externalUrl?: string | null;
  customBannerUrl?: string | null;
  userComment?: string | null;
  isWishlist?: boolean;
  position?: number;
}

interface MediaDetailModalState {
  isOpen: boolean;
  activeItem: MediaModalItem | null;
  openMediaDetail: (item: MediaModalItem) => void;
  closeMediaDetail: () => void;
  setActiveItem: (item: MediaModalItem) => void;
}

export const useMediaDetailModalStore = create<MediaDetailModalState>((set) => ({
  isOpen: false,
  activeItem: null,
  openMediaDetail: (item) => set({ isOpen: true, activeItem: item }),
  closeMediaDetail: () => set({ isOpen: false, activeItem: null }),
  setActiveItem: (item) => set({ activeItem: item }),
}));
