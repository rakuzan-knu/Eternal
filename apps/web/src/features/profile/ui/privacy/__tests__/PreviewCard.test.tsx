import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PreviewCard from '../PreviewCard';

vi.mock('@/entities/profile/model/useCurrentUser', () => ({
  useCurrentUser: () => ({
    data: {
      id: 'u1',
      username: 'alex',
      displayName: 'Alex',
      bio: 'Hello',
      avatar: null,
      banner: null,
    },
  }),
}));

describe('PreviewCard', () => {
  it('renders preview card for profile field dimensions and generic dimensions', () => {
    const { rerender } = render(<PreviewCard dimension="AVATAR" value="EVERYBODY" />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Alex')).toBeInTheDocument();

    rerender(<PreviewCard dimension="LAST_SEEN" value="EVERYBODY" />);
    expect(screen.getByText('How others see it')).toBeInTheDocument();
  });
});
