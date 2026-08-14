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

  isShareModalOpen: boolean;
  activePostForShare: PostType | null;
  openShareModal: (post: PostType) => void;
  closeShareModal: () => void;
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

  isShareModalOpen: false,
  activePostForShare: null,
  openShareModal: (post) => set({ isShareModalOpen: true, activePostForShare: post }),
  closeShareModal: () => set({ isShareModalOpen: false, activePostForShare: null }),
}));

export type { PostType, CommentType };
