import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedCollection {
  id: string;
  userId: string;
  name: string;
  postIds: string[];
  createdAt: string;
}

interface SavedCollectionsState {
  collections: SavedCollection[];
  createCollection: (userId: string, name: string) => SavedCollection;
  deleteCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  addPostToCollection: (collectionId: string, postId: string) => void;
  removePostFromCollection: (collectionId: string, postId: string) => void;
  getCollectionsForUser: (userId: string) => SavedCollection[];
}

export const useSavedCollectionsStore = create<SavedCollectionsState>()(
  persist(
    (set, get) => ({
      collections: [],

      createCollection: (userId: string, name: string) => {
        const newCollection: SavedCollection = {
          id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId,
          name: name.trim(),
          postIds: [],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          collections: [newCollection, ...state.collections],
        }));
        return newCollection;
      },

      deleteCollection: (id: string) => {
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
        }));
      },

      renameCollection: (id: string, name: string) => {
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, name: name.trim() } : c,
          ),
        }));
      },

      addPostToCollection: (collectionId: string, postId: string) => {
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c.id !== collectionId) return c;
            if (c.postIds.includes(postId)) return c;
            return { ...c, postIds: [postId, ...c.postIds] };
          }),
        }));
      },

      removePostFromCollection: (collectionId: string, postId: string) => {
        set((state) => ({
          collections: state.collections.map((c) => {
            if (c.id !== collectionId) return c;
            return { ...c, postIds: c.postIds.filter((id) => id !== postId) };
          }),
        }));
      },

      getCollectionsForUser: (userId: string) => {
        return get().collections.filter((c) => c.userId === userId);
      },
    }),
    {
      name: 'saved_collections_storage',
    },
  ),
);
