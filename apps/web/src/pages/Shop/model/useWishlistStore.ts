import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistState {
  wishlistIds: string[];
  toggleWishlist: (id: string, slug?: string) => void;
  addToWishlist: (id: string, slug?: string) => void;
  removeFromWishlist: (id: string, slug?: string) => void;
  isWishlisted: (id: string, slug?: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      wishlistIds: [],

      toggleWishlist: (id: string, slug?: string) => {
        set((state) => {
          const keys = [id, slug].filter(Boolean) as string[];
          const isCurrentlyWishlisted = keys.some((k) => state.wishlistIds.includes(k));

          if (isCurrentlyWishlisted) {
            // Remove any matching key
            return {
              wishlistIds: state.wishlistIds.filter((item) => !keys.includes(item)),
            };
          }

          // Add primary ID
          return {
            wishlistIds: [...state.wishlistIds, id],
          };
        });
      },

      addToWishlist: (id: string, slug?: string) => {
        set((state) => {
          const keys = [id, slug].filter(Boolean) as string[];
          if (keys.some((k) => state.wishlistIds.includes(k))) {
            return state;
          }
          return {
            wishlistIds: [...state.wishlistIds, id],
          };
        });
      },

      removeFromWishlist: (id: string, slug?: string) => {
        set((state) => {
          const keys = [id, slug].filter(Boolean) as string[];
          return {
            wishlistIds: state.wishlistIds.filter((item) => !keys.includes(item)),
          };
        });
      },

      isWishlisted: (id: string, slug?: string) => {
        const { wishlistIds } = get();
        if (!id) return false;
        return wishlistIds.includes(id) || (slug ? wishlistIds.includes(slug) : false);
      },

      clearWishlist: () => set({ wishlistIds: [] }),
    }),
    {
      name: 'social-network-shop-wishlist',
    },
  ),
);
