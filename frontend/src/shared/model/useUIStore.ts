import { create } from 'zustand';
import { PostType } from '../../entities/post/model/types';
import { CommentType } from '../../entities/comment/model/types';

interface UIState {
  isSidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  isEditProfileOpen: boolean;
  openEditProfile: () => void;
  closeEditProfile: () => void;
  isCommentModalOpen: boolean;
  activePostForComments: PostType | null;
  openCommentModal: (post: PostType) => void;
  closeCommentModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarExpanded: false,
  setSidebarExpanded: (expanded) => set({ isSidebarExpanded: expanded }),
  isEditProfileOpen: false,
  openEditProfile: () => set({ isEditProfileOpen: true }),
  closeEditProfile: () => set({ isEditProfileOpen: false }),
  isCommentModalOpen: false,
  activePostForComments: null,
  openCommentModal: (post) => set({ isCommentModalOpen: true, activePostForComments: post }),
  closeCommentModal: () => set({ isCommentModalOpen: false, activePostForComments: null }),
}));

export type { PostType, CommentType };
