import { create } from 'zustand';

export interface CommentType {
  id: string | number;
  author: string;
  avatar?: string;
  handle: string;
  text: string;
  time: string;
}

export interface PostType {
  id: string | number;
  author: string;
  avatar?: string;
  handle: string;
  text: string;
  type?: 'repost' | string;
  repostedBy?: string;
  time?: string;
  image?: string;
  comments?: number;
  reposts?: number;
  likes?: number;
  commentList?: CommentType[];
}

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
