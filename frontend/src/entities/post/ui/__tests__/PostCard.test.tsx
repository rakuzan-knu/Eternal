import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { PostCard } from '../PostCard';
import { useUIStore, PostType } from '../../../../shared/model/useUIStore';
import { resetUIStore } from '../../../../test/resetUIStore';

const basePost: PostType = {
  id: 1,
  author: 'Ayate',
  handle: 'ayate',
  avatar: '💀',
  text: 'Hello world',
  time: '3h',
  comments: 2,
  reposts: 1,
  likes: 5,
};

describe('PostCard', () => {
  afterEach(() => {
    resetUIStore();
  });

  it('renders author, handle, time, text and counters', () => {
    render(<PostCard post={basePost} />);

    expect(screen.getByText('Ayate')).toBeInTheDocument();
    expect(screen.getByText('@ayate • 3h')).toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render the repost banner for a regular post', () => {
    render(<PostCard post={basePost} />);

    expect(screen.queryByText(/репостнули|Ви репостнули/i)).not.toBeInTheDocument();
  });

  it('renders the repost banner with the reposter name for a repost', () => {
    const repost: PostType = { ...basePost, type: 'repost', repostedBy: 'Kolya' };

    render(<PostCard post={repost} />);

    expect(screen.getByText('Kolya')).toBeInTheDocument();
  });

  it('renders the attached image when post.image is provided', () => {
    const postWithImage: PostType = { ...basePost, image: 'https://example.com/pic.png' };

    render(<PostCard post={postWithImage} />);

    expect(screen.getByAltText('Post Attachment')).toHaveAttribute(
      'src',
      'https://example.com/pic.png',
    );
  });

  it('does not render an image when post.image is absent', () => {
    render(<PostCard post={basePost} />);

    expect(screen.queryByAltText('Post Attachment')).not.toBeInTheDocument();
  });

  it('opens the comment modal for this post when the comment button is clicked', async () => {
    const user = userEvent.setup();
    render(<PostCard post={basePost} />);

    await user.click(screen.getByText('2').closest('button')!);

    const state = useUIStore.getState();
    expect(state.isCommentModalOpen).toBe(true);
    expect(state.activePostForComments).toEqual(basePost);
  });

  it('re-clicking the comment button keeps the modal open with the latest post', async () => {
    const user = userEvent.setup();
    render(<PostCard post={basePost} />);
    const commentButton = screen.getByText('2').closest('button')!;

    await user.click(commentButton);
    await user.click(commentButton);

    expect(useUIStore.getState().isCommentModalOpen).toBe(true);
  });
});
