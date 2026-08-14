import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommentModal } from '../CommentModal';
import { useUIStore, PostType } from '../../../../shared/model/useUIStore';
import { resetUIStore } from '../../../../test/resetUIStore';

vi.mock('emoji-picker-react', () => ({
  default: () => <div data-testid="mock-emoji-picker" />,
  Theme: { DARK: 'dark' },
  EmojiStyle: { APPLE: 'apple' },
}));

const post: PostType = {
  id: 1,
  authorId: 'author-1',
  author: 'Ayate',
  handle: 'ayate',
  avatar: 'https://example.com/avatar.png',
  text: 'Post body',
  createdAt: '2026-07-15T09:00:00.000Z',
  commentList: [{ id: 10, author: 'Bob', handle: 'bob', text: 'Nice!', time: '1h' }],
};

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CommentModal />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CommentModal', () => {
  afterEach(() => {
    resetUIStore();
  });

  it('renders nothing when the modal is closed', () => {
    const { container } = renderModal();

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the modal is flagged open but there is no active post', () => {
    useUIStore.setState({ isCommentModalOpen: true, activePostForComments: null });

    const { container } = renderModal();

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the post author, text and comment list when open with an active post', () => {
    useUIStore.getState().openCommentModal(post);

    renderModal();

    expect(screen.getByText('User post Ayate')).toBeInTheDocument();
    expect(screen.getByText('Post body')).toBeInTheDocument();
    expect(screen.getByText('Nice!')).toBeInTheDocument();
  });

  it('shows the empty state when the active post has no comments', () => {
    useUIStore.getState().openCommentModal({ ...post, commentList: [] });

    renderModal();

    expect(screen.getByText('No comments')).toBeInTheDocument();
  });

  it('calls closeCommentModal when the close button is clicked', async () => {
    useUIStore.getState().openCommentModal(post);
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getAllByRole('button')[0]);

    expect(useUIStore.getState().isCommentModalOpen).toBe(false);
    expect(useUIStore.getState().activePostForComments).toBeNull();
  });
});
