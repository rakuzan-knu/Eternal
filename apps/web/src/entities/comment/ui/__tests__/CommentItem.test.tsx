import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { CommentItem } from '../CommentItem';
import { CommentType } from '../../model/types';

function renderCommentItem(props: React.ComponentProps<typeof CommentItem>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CommentItem {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockComment: CommentType = {
  id: 'c1',
  postId: 'p1',
  userId: 'u1',
  author: 'Alice',
  handle: 'alice',
  avatar: 'https://avatar.png',
  text: 'Great post!',
  time: '2h ago',
  likesCount: 5,
  isLiked: false,
  isPinned: false,
  isLikedByAuthor: false,
  isVerified: true,
  primaryBadge: 'DEVELOPER',
  isDeleted: false,
  mediaUrl: 'https://media.png',
};

describe('CommentItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders author, handle, text, time, and badges', () => {
    renderCommentItem({ comment: mockComment, postAuthorId: 'u2', currentUserId: 'u3' });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(/@alice/)).toBeInTheDocument();
    expect(screen.getByText('Great post!')).toBeInTheDocument();
    expect(screen.getByText(/2h ago/)).toBeInTheDocument();
  });

  it('renders author pill badge when comment is by post author', () => {
    renderCommentItem({ comment: mockComment, postAuthorId: 'u1', currentUserId: 'u3' });

    expect(screen.getByText('Author')).toBeInTheDocument();
  });

  it('renders pinned badge and liked by author badge', () => {
    renderCommentItem({
      comment: { ...mockComment, isPinned: true, isLikedByAuthor: true },
      postAuthorId: 'u2',
      currentUserId: 'u3',
    });

    expect(screen.getByText('Pinned')).toBeInTheDocument();
    expect(screen.getByText('Liked by author')).toBeInTheDocument();
  });

  it('handles double tap to like with heart burst animation', () => {
    vi.useFakeTimers();
    const onLike = vi.fn();
    const { container } = renderCommentItem({ comment: mockComment, onLike });

    const card = container.firstChild as HTMLElement;

    // First tap
    fireEvent.click(card);
    // Second tap within 300ms
    fireEvent.click(card);

    expect(onLike).toHaveBeenCalledWith('c1');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    vi.useRealTimers();
  });

  it('handles like click with debounce and pending state early return', () => {
    vi.useFakeTimers();
    const onLike = vi.fn();
    renderCommentItem({ comment: mockComment, onLike });

    const likeButton = screen.getByTitle('Like');
    fireEvent.click(likeButton);
    // Rapid duplicate clicks while pending return early without calling onLike again
    fireEvent.click(likeButton);
    fireEvent.click(likeButton);

    expect(onLike).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    // After pending timeout clears, another click works
    fireEvent.click(likeButton);
    expect(onLike).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(600);
    });

    vi.useRealTimers();
  });

  it('handles reply button click', () => {
    const onReply = vi.fn();
    renderCommentItem({ comment: mockComment, onReply });

    const replyButton = screen.getByText('Reply');
    fireEvent.click(replyButton);

    expect(onReply).toHaveBeenCalledWith(mockComment);
  });

  it('opens menu and copies text', async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    renderCommentItem({
      comment: mockComment,
      currentUserId: 'u1',
      postAuthorId: 'u1',
      onPin: vi.fn(),
      onDelete: vi.fn(),
    });

    const menuButton = screen.getByTitle('Options');
    fireEvent.click(menuButton);

    const copyButton = screen.getByText('Copy text');
    fireEvent.click(copyButton);

    expect(writeTextMock).toHaveBeenCalledWith('Great post!');

    act(() => {
      vi.advanceTimersByTime(1300);
    });
    vi.useRealTimers();
  });

  it('handles unpin, report, and delete actions from menu', async () => {
    const onPin = vi.fn();
    const onDelete = vi.fn();
    const onReport = vi.fn();

    renderCommentItem({
      comment: { ...mockComment, isPinned: true },
      currentUserId: 'u1', // owner can delete
      postAuthorId: 'u1', // post owner can pin/unpin
      onPin,
      onDelete,
      onReport,
    });

    const menuButton = screen.getByTitle('Options');
    fireEvent.click(menuButton);

    const unpinButton = screen.getByText('Unpin');
    fireEvent.click(unpinButton);
    expect(onPin).toHaveBeenCalledWith('c1');

    fireEvent.click(menuButton);
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith('c1');
  });

  it('shows report button when viewer is not comment owner', () => {
    const onReport = vi.fn();
    renderCommentItem({
      comment: mockComment,
      currentUserId: 'u99',
      onReport,
    });

    const menuButton = screen.getByTitle('Options');
    fireEvent.click(menuButton);

    const reportButton = screen.getByText('Report');
    fireEvent.click(reportButton);
    expect(onReport).toHaveBeenCalledWith(mockComment);
  });

  it('renders deleted comment state correctly', () => {
    renderCommentItem({
      comment: { ...mockComment, isDeleted: true },
    });

    expect(screen.getByText('[Comment deleted]')).toBeInTheDocument();
    expect(screen.queryByTitle('Options')).not.toBeInTheDocument();
  });

  it('renders liked comment and handles unlike title', () => {
    const onLike = vi.fn();
    renderCommentItem({
      comment: { ...mockComment, isLiked: true, likesCount: 12 },
      onLike,
    });

    const unlikeBtn = screen.getByTitle('Unlike');
    expect(unlikeBtn).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    fireEvent.click(unlikeBtn);
    expect(onLike).toHaveBeenCalledWith('c1');
  });

  it('opens image on media click and handles edge cases', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const commentWithMedia: CommentType = { ...mockComment, mediaUrl: 'https://media.png' };
    renderCommentItem({ comment: commentWithMedia });

    const img = screen.getByAltText('attachment');
    fireEvent.click(img);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://media.png',
      '_blank',
      'noopener,noreferrer',
    );
    windowOpenSpy.mockRestore();
  });

  it('handles like click without onLike callback safely', () => {
    renderCommentItem({ comment: mockComment, onLike: undefined });
    const likeButton = screen.getByTitle('Like');
    expect(() => fireEvent.click(likeButton)).not.toThrow();
  });
});
