import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from '../PostCard';
import { renderWithProviders } from '@/test/renderWithProviders';
import { useUIStore } from '@/shared/model/useUIStore';
import { useAuthStore } from '@/shared/model/useAuthStore';

describe('PostCard (Comprehensive Suite)', () => {
  const mockPost = {
    id: 'post-1',
    authorId: 'author-1',
    author: 'Nikola Tesla',
    handle: 'tesla',
    avatar: 'https://example.com/tesla.jpg',
    text: 'Wireless transmission of energy across the globe! https://example.com/energy',
    likes: 85,
    comments: 12,
    reposts: 4,
    sharesCount: 9,
    isLiked: false,
    isSaved: false,
    isReposted: false,
    isPinned: true,
    createdAt: new Date().toISOString(),
    media: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ userId: 'current-user-1' });
  });

  it('renders post card with pinned banner, author header, and action buttons', () => {
    renderWithProviders(<PostCard post={mockPost as any} queryKey={['feed']} />);

    expect(screen.getByText('Pinned post')).toBeInTheDocument();
    expect(screen.getByText('Nikola Tesla')).toBeInTheDocument();
    expect(screen.getByText(/wireless transmission/i)).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument(); // Likes
    expect(screen.getByText('12')).toBeInTheDocument(); // Comments
    expect(screen.getByText('4')).toBeInTheDocument(); // Reposts
  });

  it('opens comment modal and share modal on respective button clicks', async () => {
    const user = userEvent.setup({ delay: null });
    const openCommentModalSpy = vi.spyOn(useUIStore.getState(), 'openCommentModal');
    const openShareModalSpy = vi.spyOn(useUIStore.getState(), 'openShareModal');

    renderWithProviders(<PostCard post={mockPost as any} queryKey={['feed']} />);

    // Click comment button
    const commentBtn = screen.getByText('12');
    await user.click(commentBtn);
    expect(openCommentModalSpy).toHaveBeenCalledWith(mockPost);

    // Click share button
    const shareBtn = screen.getByTitle('Share post');
    await user.click(shareBtn);
    expect(openShareModalSpy).toHaveBeenCalledWith(mockPost);
  });

  it('handles post menu actions (Hide post, Report, Delete)', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<PostCard post={mockPost as any} queryKey={['feed']} />);

    // Post menu trigger button
    const menuBtn = screen.getByLabelText(/more options|post options/i);
    await user.click(menuBtn);

    expect(screen.getByText(/hide post/i)).toBeInTheDocument();
    const hideBtn = screen.getByText(/hide post/i);
    await user.click(hideBtn);
  });
});
