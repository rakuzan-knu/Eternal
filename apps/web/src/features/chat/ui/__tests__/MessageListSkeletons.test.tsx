import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  SkeletonMessage,
  OlderMessagesSkeleton,
  MessageThreadSkeleton,
} from '../MessageListSkeletons';

describe('MessageListSkeletons', () => {
  it('renders skeleton message for own and other users', () => {
    const { container: ownContainer } = render(<SkeletonMessage own={true} withMedia={true} />);
    expect(ownContainer.querySelector('.justify-end')).toBeInTheDocument();

    const { container: otherContainer } = render(<SkeletonMessage own={false} withMedia={false} />);
    expect(otherContainer.querySelector('.justify-start')).toBeInTheDocument();
  });

  it('renders older messages skeleton', () => {
    render(<OlderMessagesSkeleton />);
    const status = screen.getByRole('status', { name: /loading older messages/i });
    expect(status).toBeInTheDocument();
  });

  it('renders message thread skeleton', () => {
    render(<MessageThreadSkeleton />);
    const status = screen.getByRole('status', { name: /loading messages/i });
    expect(status).toBeInTheDocument();
  });
});
