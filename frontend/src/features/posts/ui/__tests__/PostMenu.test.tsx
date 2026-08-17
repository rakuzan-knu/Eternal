import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostMenu } from '../PostMenu';
import { useHiddenPostsStore } from '@/shared/model/useHiddenPostsStore';

describe('PostMenu', () => {
  it('opens popup menu on trigger click and triggers callbacks', () => {
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

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(screen.getByText('Save post')).toBeInTheDocument();
    expect(screen.getByText('Hide post')).toBeInTheDocument();
    expect(screen.getByText('Block author')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Save post'));
    expect(onSave).toHaveBeenCalled();
  });

  it('hides post when clicking Hide post', () => {
    render(<PostMenu postId="post-200" isOwner={false} />);

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Hide post'));

    expect(useHiddenPostsStore.getState().hiddenIds.has('post-200')).toBe(true);
  });
});
