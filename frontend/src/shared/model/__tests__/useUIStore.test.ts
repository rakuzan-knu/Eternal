import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../useUIStore';
import { PostType } from '@/entities/post/model/types';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      isEditProfileOpen: false,
      editProfileInitialTab: 'account',
      isCommentModalOpen: false,
      activePostForComments: null,
      isShareModalOpen: false,
      activePostForShare: null,
    });
  });

  it('manages edit profile modal state with custom and default initial tabs', () => {
    expect(useUIStore.getState().isEditProfileOpen).toBe(false);

    useUIStore.getState().openEditProfile('security');
    expect(useUIStore.getState().isEditProfileOpen).toBe(true);
    expect(useUIStore.getState().editProfileInitialTab).toBe('security');

    useUIStore.getState().closeEditProfile();
    expect(useUIStore.getState().isEditProfileOpen).toBe(false);

    // Default tab fallback
    useUIStore.getState().openEditProfile();
    expect(useUIStore.getState().editProfileInitialTab).toBe('account');
  });

  it('manages comment and share modals', () => {
    const mockPost = {
      id: 'p1',
      authorId: 'u1',
      author: 'User One',
      handle: 'user1',
      text: 'hello',
      createdAt: '2026-01-01',
      likes: 0,
      comments: 0,
      reposts: 0,
      isLiked: false,
      isReposted: false,
      isSaved: false,
    } as unknown as PostType;

    useUIStore.getState().openCommentModal(mockPost);
    expect(useUIStore.getState().isCommentModalOpen).toBe(true);
    expect(useUIStore.getState().activePostForComments).toEqual(mockPost);

    useUIStore.getState().closeCommentModal();
    expect(useUIStore.getState().isCommentModalOpen).toBe(false);
    expect(useUIStore.getState().activePostForComments).toBeNull();

    useUIStore.getState().openShareModal(mockPost);
    expect(useUIStore.getState().isShareModalOpen).toBe(true);
    expect(useUIStore.getState().activePostForShare).toEqual(mockPost);

    useUIStore.getState().closeShareModal();
    expect(useUIStore.getState().isShareModalOpen).toBe(false);
    expect(useUIStore.getState().activePostForShare).toBeNull();
  });
});
