import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ReactionBadge from '../ReactionBadge';
import type { ReactionSummary } from '@/entities/chat/model/types';

describe('ReactionBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockReaction: ReactionSummary = {
    emoji: '❤️',
    count: 2,
    selfReacted: false,
    users: [
      {
        id: 'usr-1',
        username: 'alice',
        displayName: 'Alice',
        avatar: 'https://example.com/alice.jpg',
      },
      { id: 'usr-2', username: 'bob', displayName: 'Bob', avatar: null },
    ],
  };

  it('renders emoji and count', () => {
    render(<ReactionBadge reaction={mockReaction} currentUserId="usr-me" onToggle={vi.fn()} />);

    expect(screen.getByText('❤️')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders user avatars inside the badge capsule', () => {
    render(<ReactionBadge reaction={mockReaction} currentUserId="usr-me" onToggle={vi.fn()} />);

    const img = screen.getByAltText('Alice');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/alice.jpg');
    expect(screen.getByText('B')).toBeInTheDocument(); // fallback initial for Bob
  });

  it('toggles reaction immediately on single click without opening modal', () => {
    const onToggle = vi.fn();
    render(<ReactionBadge reaction={mockReaction} currentUserId="usr-me" onToggle={onToggle} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onToggle).toHaveBeenCalledWith('❤️', false, expect.any(Object));
  });

  it('toggles off when already self-reacted', () => {
    const onToggle = vi.fn();
    const selfReactedReaction: ReactionSummary = {
      ...mockReaction,
      selfReacted: true,
    };

    render(
      <ReactionBadge reaction={selfReactedReaction} currentUserId="usr-1" onToggle={onToggle} />,
    );

    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-purple-500/25');

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith('❤️', true, expect.any(Object));
  });

  it('opens hover popover tooltip after 300ms hover delay', () => {
    render(<ReactionBadge reaction={mockReaction} currentUserId="usr-1" onToggle={vi.fn()} />);

    const badgeContainer = screen.getByText('❤️').closest('div')!;

    fireEvent.mouseEnter(badgeContainer);
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('(You)')).toBeInTheDocument();
  });

  it('opens tooltip immediately on right click (context menu)', () => {
    render(<ReactionBadge reaction={mockReaction} currentUserId="usr-me" onToggle={vi.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.contextMenu(button);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('handles mouseLeave, quick re-entry, and avatar image onError', () => {
    const { container } = render(
      <ReactionBadge reaction={mockReaction} currentUserId="usr-me" onToggle={vi.fn()} />,
    );

    const badgeContainer = screen.getByText('❤️').closest('.relative.inline-block')!;

    // 1. Enter and leave immediately
    fireEvent.mouseEnter(badgeContainer);
    fireEvent.mouseLeave(badgeContainer);

    // 2. Re-enter before leave timeout fires (covers lines 30-32)
    fireEvent.mouseEnter(badgeContainer);

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText('Alice')).toBeInTheDocument();

    // 3. Leave and advance timers
    fireEvent.mouseLeave(badgeContainer);
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // 4. Avatar onError
    const img = container.querySelector('img')!;
    fireEvent.error(img);
    expect(img.style.display).toBe('none');
  });

  it('renders tooltip fallback when reaction.users is empty', () => {
    const emptyUsersReaction: ReactionSummary = {
      emoji: '👍',
      count: 3,
      selfReacted: true,
      users: [],
    };

    render(
      <ReactionBadge reaction={emptyUsersReaction} currentUserId="usr-me" onToggle={vi.fn()} />,
    );

    const button = screen.getByRole('button');
    fireEvent.contextMenu(button);

    expect(screen.getByText('You reacted')).toBeInTheDocument();
  });
});
