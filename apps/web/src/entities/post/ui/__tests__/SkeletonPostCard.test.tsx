import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SkeletonPostCard, SkeletonFeed } from '../SkeletonPostCard';

describe('SkeletonPostCard & SkeletonFeed', () => {
  it('renders skeleton post card without media', () => {
    const { container } = render(<SkeletonPostCard withMedia={false} />);
    expect(container.querySelectorAll('.skeleton-shimmer').length).toBeGreaterThan(0);
  });

  it('renders skeleton post card with media skeleton', () => {
    const { container } = render(<SkeletonPostCard withMedia={true} />);
    const mediaBone = container.querySelector('.h-104');
    expect(mediaBone).toBeInTheDocument();
  });

  it('renders skeleton feed with specified count', () => {
    render(<SkeletonFeed count={4} />);
    const feed = screen.getByRole('status', { name: /loading the feed/i });
    expect(feed.children).toHaveLength(4);
  });
});
