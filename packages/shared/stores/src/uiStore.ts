import { create } from 'zustand';

export type AppTheme = 'dark' | 'light' | 'system';

export interface UIState {
  theme: AppTheme;
  isSidebarOpen: boolean;
  activeConversationId: string | null;
  activeModal: string | null;
  setTheme: (theme: AppTheme) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveConversationId: (id: string | null) => void;
  openModal: (modalName: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  isSidebarOpen: true,
  activeConversationId: null,
  activeModal: null,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),
  openModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),
}));
