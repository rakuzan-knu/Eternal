import { create } from 'zustand';
import { PostType } from '../../entities/post/model/types';
import { CommentType } from '../../entities/comment/model/types';

interface UIState {
  isSidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  toggleSidebar: () => void;

  isChatListExpanded: boolean;
  setChatListExpanded: (expanded: boolean) => void;
  toggleChatList: () => void;

  activeConversationId: string | null;
  setActiveConversationId: (conversationId: string | null) => void;

  isEditProfileOpen: boolean;
  openEditProfile: () => void;
  closeEditProfile: () => void;
  isCommentModalOpen: boolean;
  activePostForComments: PostType | null;
  openCommentModal: (post: PostType) => void;
  closeCommentModal: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  isSidebarExpanded: false,
  setSidebarExpanded: (expanded) => set({ isSidebarExpanded: expanded }),
  toggleSidebar: () => set({ isSidebarExpanded: !get().isSidebarExpanded }),

  isChatListExpanded: true,
  setChatListExpanded: (expanded) => set({ isChatListExpanded: expanded }),
  toggleChatList: () => set({ isChatListExpanded: !get().isChatListExpanded }),

  activeConversationId: null,
  setActiveConversationId: (conversationId) => set({ activeConversationId: conversationId }),

  isEditProfileOpen: false,
  openEditProfile: () => set({ isEditProfileOpen: true }),
  closeEditProfile: () => set({ isEditProfileOpen: false }),
  isCommentModalOpen: false,
  activePostForComments: null,
  openCommentModal: (post) => set({ isCommentModalOpen: true, activePostForComments: post }),
  closeCommentModal: () => set({ isCommentModalOpen: false, activePostForComments: null }),
}));

export type { PostType, CommentType };
