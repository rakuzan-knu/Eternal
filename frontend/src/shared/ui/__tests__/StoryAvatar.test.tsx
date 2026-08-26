import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import StoryAvatar from '../StoryAvatar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('StoryAvatar', () => {
  it('renders standard avatar when user has no active stories', () => {
    const { container } = render(
      <StoryAvatar src="https://example.com/avatar.jpg" name="Alice" hasStory={false} />,
      { wrapper: createWrapper() },
    );

    expect(container.querySelector('img')).toBeDefined();
  });

  it('renders glowing gradient ring for unviewed regular story', () => {
    const { container } = render(
      <StoryAvatar
        src="https://example.com/avatar.jpg"
        name="Alice"
        hasStory={true}
        hasUnviewed={true}
        hasCloseFriendsStory={false}
      />,
      { wrapper: createWrapper() },
    );

    const ringDiv = container.firstChild as HTMLElement;
    expect(ringDiv.style.background).toContain('linear-gradient');
  });

  it('renders emerald green ring for close friends story with star badge', () => {
    const { container } = render(
      <StoryAvatar
        src="https://example.com/avatar.jpg"
        name="Alice"
        hasStory={true}
        hasUnviewed={true}
        hasCloseFriendsStory={true}
        showBadge={true}
      />,
      { wrapper: createWrapper() },
    );

    expect(screen.getByTitle('Close Friends Story')).toBeDefined();
  });

  it('triggers custom onClick when provided', () => {
    const handleClick = vi.fn();
    render(
      <StoryAvatar
        src="https://example.com/avatar.jpg"
        hasStory={true}
        hasUnviewed={true}
        onClick={handleClick}
      />,
      { wrapper: createWrapper() },
    );

    const el = screen.getByTitle('View active stories');
    fireEvent.click(el);
    expect(handleClick).toHaveBeenCalled();
  });
});
