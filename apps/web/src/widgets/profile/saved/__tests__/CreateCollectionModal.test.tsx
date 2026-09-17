import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateCollectionModal } from '../CreateCollectionModal';
import { PostType } from '@/entities/post/model/types';

describe('CreateCollectionModal', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <CreateCollectionModal isOpen={false} onClose={vi.fn()} savedPosts={[]} onCreate={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('submits new collection name and selected posts', () => {
    const onCreate = vi.fn();
    const onClose = vi.fn();
    const mockPost: PostType = {
      id: 'post-1',
      authorId: 'u1',
      author: 'User',
      handle: 'user',
      avatar: null,
      text: 'Saved text',
      createdAt: '2026-01-01',
      likes: 0,
      comments: 0,
      reposts: 0,
      sharesCount: 0,
      isLiked: false,
      isReposted: false,
      isSaved: true,
      isFollowing: false,
      isOwner: false,
      media: [],
    };

    render(
      <CreateCollectionModal
        isOpen={true}
        onClose={onClose}
        savedPosts={[mockPost]}
        onCreate={onCreate}
      />,
    );

    expect(screen.getByText('New collection')).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/design inspiration/i);
    fireEvent.change(input, { target: { value: 'Inspo' } });

    // Select post
    const postItem = screen.getByText('Saved text');
    fireEvent.click(postItem);

    const submitBtn = screen.getByRole('button', { name: 'Create collection' });
    fireEvent.click(submitBtn);

    expect(onCreate).toHaveBeenCalledWith('Inspo', ['post-1']);
    expect(onClose).toHaveBeenCalled();
  });

  it('allows clearing selection and cancelling', () => {
    const onClose = vi.fn();
    const mockPost: PostType = {
      id: 'post-1',
      authorId: 'u1',
      author: 'User',
      handle: 'user',
      avatar: null,
      text: 'Saved text',
      createdAt: '2026-01-01',
      likes: 0,
      comments: 0,
      reposts: 0,
      sharesCount: 0,
      isLiked: false,
      isReposted: false,
      isSaved: true,
      isFollowing: false,
      isOwner: false,
      media: [],
    };

    render(
      <CreateCollectionModal
        isOpen={true}
        onClose={onClose}
        savedPosts={[mockPost]}
        onCreate={vi.fn()}
      />,
    );

    // Select post
    const postItem = screen.getByText('Saved text');
    fireEvent.click(postItem);

    // Clear selection
    const clearBtn = screen.getByText('Clear selection');
    fireEvent.click(clearBtn);

    // Cancel
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
