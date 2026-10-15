import React, { Profiler } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConversationView } from '@/entities/chat/model/types';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import ChatListItem from '../../ui/ChatListItem';

describe('chat presence render isolation', () => {
  beforeEach(() => {
    useAuthStore.setState({ userId: 'me', isAuthenticated: true });
    usePresenceStore.setState({ onlineUserIds: new Set(), userActivities: {} });
  });

  it('updates the affected row indicator without committing other rows or rendering the list', () => {
    const commits = new Map<string, number>();
    const recordCommit = (id: string) => commits.set(id, (commits.get(id) ?? 0) + 1);
    let listRenders = 0;
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    function ConversationRows() {
      listRenders += 1;
      return ['alice', 'bob'].map((id) => {
        const conversation = {
          id,
          type: 'DIRECT',
          name: null,
          avatar: null,
          unreadCount: 0,
          myMuteLevel: 'NONE',
          createdAt: '2026-10-10T10:00:00Z',
          updatedAt: '2026-10-10T10:00:00Z',
          lastMessage: null,
          participants: [{ userId: id, user: { id, username: id, displayName: id, avatar: null } }],
        } as ConversationView;
        return (
          <section aria-label={id} key={id}>
            <Profiler id={id} onRender={recordCommit}>
              <ChatListItem
                conversation={conversation}
                currentUserId="me"
                isActive={false}
                isPinnedLocally={false}
                isForcedUnread={false}
                onSelect={vi.fn()}
                onTogglePinLocally={vi.fn()}
                onToggleUnreadLocally={vi.fn()}
              />
            </Profiler>
          </section>
        );
      });
    }
    const { unmount } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ConversationRows />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    commits.clear();
    const before = listRenders;
    act(() => usePresenceStore.getState().setOnline('alice'));
    expect(
      within(screen.getByRole('region', { name: 'alice' })).getByLabelText('Online'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'bob' })).getByLabelText('Offline'),
    ).toBeInTheDocument();
    expect(commits.get('alice')).toBe(1);
    expect(commits.get('bob') ?? 0).toBe(0);
    expect(listRenders).toBe(before);
    commits.clear();
    act(() =>
      usePresenceStore.getState().setUserActivity('unrelated', { type: 'gaming', title: 'Game' }),
    );
    expect(commits.size).toBe(0);
    expect(listRenders).toBe(before);
    unmount();
    queryClient.clear();
  });
});
