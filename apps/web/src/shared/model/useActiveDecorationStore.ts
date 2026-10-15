import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AvatarDecorationDto,
  DisplayNameStyleDto,
  NameplateDto,
} from '@social-network/shared-contracts';
import { registerSessionResetHandler } from './resetSession';

interface ActiveDecorationState {
  activeDecoration: AvatarDecorationDto | null;
  activeNameplate: NameplateDto | null;
  activeNameStyle: DisplayNameStyleDto | null;
  avatarUrl: string | null;
  userId: string | null;
  setActiveDecoration: (decoration: AvatarDecorationDto | null) => void;
  setActiveNameplate: (nameplate: NameplateDto | null) => void;
  setActiveNameStyle: (nameStyle: DisplayNameStyleDto | null) => void;
  syncUser: (
    user:
      | {
          id?: string | null;
          avatar?: string | null;
          activeDecoration?: AvatarDecorationDto | null;
          activeNameplate?: NameplateDto | null;
          displayNameStyle?: DisplayNameStyleDto | null;
        }
      | null
      | undefined,
  ) => void;
}

export const useActiveDecorationStore = create<ActiveDecorationState>()(
  persist(
    (set) => ({
      activeDecoration: null,
      activeNameplate: null,
      activeNameStyle: null,
      avatarUrl: null,
      userId: null,
      setActiveDecoration: (activeDecoration) => set({ activeDecoration }),
      setActiveNameplate: (activeNameplate) => set({ activeNameplate }),
      setActiveNameStyle: (activeNameStyle) => set({ activeNameStyle }),
      syncUser: (user) => {
        if (!user) return;
        set((state) => ({
          activeDecoration:
            user.activeDecoration !== undefined
              ? (user.activeDecoration ?? null)
              : state.activeDecoration,
          activeNameplate:
            user.activeNameplate !== undefined
              ? (user.activeNameplate ?? null)
              : state.activeNameplate,
          activeNameStyle:
            user.displayNameStyle !== undefined
              ? (user.displayNameStyle ?? null)
              : state.activeNameStyle,
          avatarUrl: user.avatar !== undefined ? (user.avatar ?? null) : state.avatarUrl,
          userId: user.id !== undefined ? (user.id ?? null) : state.userId,
        }));
      },
    }),
    {
      name: 'active-avatar-decoration',
    },
  ),
);

registerSessionResetHandler(() => {
  useActiveDecorationStore.setState({
    activeDecoration: null,
    activeNameplate: null,
    activeNameStyle: null,
    avatarUrl: null,
    userId: null,
  });
});
