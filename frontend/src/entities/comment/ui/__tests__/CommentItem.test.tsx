import { render, screen, fireEvent } from '@testing-library/react';
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

  it('renders pinned badge when comment is pinned', () => {
    renderCommentItem({
      comment: { ...mockComment, isPinned: true },
      postAuthorId: 'u2',
      currentUserId: 'u3',
    });

    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });

  it('handles like click', () => {
    const onLike = vi.fn();
    renderCommentItem({ comment: mockComment, onLike });

    const likeButton = screen.getByTitle('Like');
    fireEvent.click(likeButton);

    expect(onLike).toHaveBeenCalledWith('c1');
  });

  it('handles reply button click', () => {
    const onReply = vi.fn();
    renderCommentItem({ comment: mockComment, onReply });

    const replyButton = screen.getByText('Reply');
    fireEvent.click(replyButton);

    expect(onReply).toHaveBeenCalledWith(mockComment);
  });

  it('opens menu and copies text', async () => {
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
  });

  it('handles pin, report, and delete actions from menu', async () => {
    const onPin = vi.fn();
    const onDelete = vi.fn();
    const onReport = vi.fn();

    renderCommentItem({
      comment: mockComment,
      currentUserId: 'u1', // owner can delete
      postAuthorId: 'u1', // post owner can pin
      onPin,
      onDelete,
      onReport,
    });

    const menuButton = screen.getByTitle('Options');
    fireEvent.click(menuButton);

    const pinButton = screen.getByText('Pin to top');
    fireEvent.click(pinButton);
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

  it('opens image on media click', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderCommentItem({ comment: mockComment });

    const img = screen.getByAltText('attachment');
    fireEvent.click(img);

    expect(windowOpenSpy).toHaveBeenCalledWith('https://media.png', '_blank');
    windowOpenSpy.mockRestore();
  });
});
