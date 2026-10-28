import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActivePostItem {
  id: string | number;
  authorId?: string;
  [key: string]: unknown;
}

interface UIState {
  isSidebarExpanded: boolean;
  isSidebarPinned: boolean;
  toggleSidebarPin: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  toggleSidebar: () => void;

  isChatListExpanded: boolean;
  setChatListExpanded: (expanded: boolean) => void;
  toggleChatList: () => void;

  activeConversationId: string | null;
  setActiveConversationId: (conversationId: string | null) => void;

  isEditProfileOpen: boolean;
  editProfileInitialTab: string;
  openEditProfile: (tab?: string) => void;
  closeEditProfile: () => void;

  isCommentModalOpen: boolean;
  activePostForComments: ActivePostItem | any | null;
  openCommentModal: (post: any) => void;
  closeCommentModal: () => void;

  isShareModalOpen: boolean;
  activePostForShare: ActivePostItem | any | null;
  openShareModal: (post: any) => void;
  closeShareModal: () => void;

  isCreateReelOpen: boolean;
  openCreateReel: () => void;
  closeCreateReel: () => void;

  activePostMenuId: string | number | null;
  setActivePostMenuId: (id: string | number | null) => void;

  isGlobalSearchOpen: boolean;
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  toggleGlobalSearch: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      isSidebarExpanded: false,
      isSidebarPinned: false,
      toggleSidebarPin: () =>
        set({ isSidebarPinned: !get().isSidebarPinned, isSidebarExpanded: true }),
      setSidebarExpanded: (expanded) => set({ isSidebarExpanded: expanded }),
      toggleSidebar: () =>
        set({ isSidebarExpanded: !get().isSidebarExpanded, isSidebarPinned: false }),

      isChatListExpanded: true,
      setChatListExpanded: (expanded) => set({ isChatListExpanded: expanded }),
      toggleChatList: () => set({ isChatListExpanded: !get().isChatListExpanded }),

      activeConversationId: null,
      setActiveConversationId: (conversationId) => set({ activeConversationId: conversationId }),

      isEditProfileOpen: false,
      editProfileInitialTab: 'account',
      openEditProfile: (tab?: unknown) =>
        set({
          isEditProfileOpen: true,
          editProfileInitialTab: typeof tab === 'string' && tab ? tab : 'account',
        }),
      closeEditProfile: () => set({ isEditProfileOpen: false }),

      isCommentModalOpen: false,
      activePostForComments: null,
      openCommentModal: (post) => set({ isCommentModalOpen: true, activePostForComments: post }),
      closeCommentModal: () => set({ isCommentModalOpen: false, activePostForComments: null }),

      isShareModalOpen: false,
      activePostForShare: null,
      openShareModal: (post) => set({ isShareModalOpen: true, activePostForShare: post }),
      closeShareModal: () => set({ isShareModalOpen: false, activePostForShare: null }),

      isCreateReelOpen: false,
      openCreateReel: () => set({ isCreateReelOpen: true }),
      closeCreateReel: () => set({ isCreateReelOpen: false }),

      activePostMenuId: null,
      setActivePostMenuId: (id) => set({ activePostMenuId: id }),

      isGlobalSearchOpen: false,
      openGlobalSearch: () => set({ isGlobalSearchOpen: true }),
      closeGlobalSearch: () => set({ isGlobalSearchOpen: false }),
      toggleGlobalSearch: () => set({ isGlobalSearchOpen: !get().isGlobalSearchOpen }),
    }),
    {
      name: 'eternal-navigation-preferences',
      partialize: (state) => ({ isSidebarPinned: state.isSidebarPinned }),
      merge: (persisted, current) => {
        const pinned =
          typeof persisted === 'object' &&
          persisted !== null &&
          'isSidebarPinned' in persisted &&
          persisted.isSidebarPinned === true;
        return {
          ...current,
          isSidebarPinned: pinned,
          isSidebarExpanded: pinned && typeof window !== 'undefined' && window.innerWidth >= 768,
        };
      },
    },
  ),
);

export type PostType = ActivePostItem;
