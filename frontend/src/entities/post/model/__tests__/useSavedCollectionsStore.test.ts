import { describe, it, expect, beforeEach } from 'vitest';
import { useSavedCollectionsStore } from '../useSavedCollectionsStore';

describe('useSavedCollectionsStore', () => {
  beforeEach(() => {
    useSavedCollectionsStore.setState({ collections: [] });
  });

  it('creates a new collection', () => {
    const col = useSavedCollectionsStore.getState().createCollection('usr-1', 'My Favorites');
    expect(col.name).toBe('My Favorites');
    expect(col.userId).toBe('usr-1');
    expect(useSavedCollectionsStore.getState().collections).toHaveLength(1);
  });

  it('renames an existing collection', () => {
    const col = useSavedCollectionsStore.getState().createCollection('usr-1', 'Old Name');
    useSavedCollectionsStore.getState().renameCollection(col.id, 'New Name');

    const updated = useSavedCollectionsStore.getState().collections[0];
    expect(updated.name).toBe('New Name');
  });

  it('deletes a collection', () => {
    const col = useSavedCollectionsStore.getState().createCollection('usr-1', 'To Delete');
    useSavedCollectionsStore.getState().deleteCollection(col.id);

    expect(useSavedCollectionsStore.getState().collections).toHaveLength(0);
  });

  it('adds and removes posts from collection', () => {
    const col = useSavedCollectionsStore.getState().createCollection('usr-1', 'Memes');
    useSavedCollectionsStore.getState().addPostToCollection(col.id, 'post-1');
    useSavedCollectionsStore.getState().addPostToCollection(col.id, 'post-2');
    // Duplicate addition should be ignored
    useSavedCollectionsStore.getState().addPostToCollection(col.id, 'post-1');

    let current = useSavedCollectionsStore.getState().collections[0];
    expect(current.postIds).toEqual(['post-2', 'post-1']);

    useSavedCollectionsStore.getState().removePostFromCollection(col.id, 'post-1');
    current = useSavedCollectionsStore.getState().collections[0];
    expect(current.postIds).toEqual(['post-2']);
  });

  it('filters collections for a specific user', () => {
    useSavedCollectionsStore.getState().createCollection('usr-1', 'Col 1');
    useSavedCollectionsStore.getState().createCollection('usr-2', 'Col 2');

    const user1Cols = useSavedCollectionsStore.getState().getCollectionsForUser('usr-1');
    expect(user1Cols).toHaveLength(1);
    expect(user1Cols[0].name).toBe('Col 1');
  });
});
