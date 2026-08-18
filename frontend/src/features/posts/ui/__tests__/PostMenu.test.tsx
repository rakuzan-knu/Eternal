import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostMenu } from '../PostMenu';
import { useHiddenPostsStore } from '@/shared/model/useHiddenPostsStore';

describe('PostMenu', () => {
  it('opens popup menu on trigger click and triggers callbacks for non-owner', () => {
    const onSave = vi.fn();
    const onReport = vi.fn();
    const onBlockAuthor = vi.fn();

    render(
      <PostMenu
        postId="post-100"
        isOwner={false}
        onSave={onSave}
        onReport={onReport}
        onBlockAuthor={onBlockAuthor}
      />,
    );

    const trigger = screen.getByRole('button', { name: /more options/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Save post')).toBeInTheDocument();
    expect(screen.getByText('Hide post')).toBeInTheDocument();
    expect(screen.getByText('Block author')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
    expect(screen.getByText('Copy link')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Save post'));
    expect(onSave).toHaveBeenCalled();
  });

  it('renders owner-specific menu items for owner', () => {
    const onDelete = vi.fn();
    const onEdit = vi.fn();
    const onToggleHideLikes = vi.fn();
    const onToggleDisableComments = vi.fn();

    render(
      <PostMenu
        postId="post-100"
        isOwner={true}
        onDelete={onDelete}
        onEdit={onEdit}
        onToggleHideLikes={onToggleHideLikes}
        onToggleDisableComments={onToggleDisableComments}
      />,
    );

    const trigger = screen.getByRole('button', { name: /more options/i });
    fireEvent.click(trigger);

    expect(screen.getByText('Edit post')).toBeInTheDocument();
    expect(screen.getByText('Delete your post')).toBeInTheDocument();
    expect(screen.getByText('Hide like count')).toBeInTheDocument();
    expect(screen.getByText('Disable commenting')).toBeInTheDocument();
    expect(screen.queryByText('Hide post')).not.toBeInTheDocument();
    expect(screen.queryByText('Report')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Delete your post'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('hides post when clicking Hide post on non-owner post', () => {
    render(<PostMenu postId="post-200" isOwner={false} />);

    fireEvent.click(screen.getByRole('button', { name: /more options/i }));
    fireEvent.click(screen.getByText('Hide post'));

    expect(useHiddenPostsStore.getState().hiddenIds.has('post-200')).toBe(true);
  });
});
