import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMuteConversation,
  useMarkConversationRead,
  useClearChatHistory,
  useDeleteConversation,
  usePromoteMember,
  useDemoteMember,
  useRemoveMember,
} from '../useConversationMutations';
import { chatApi } from '../../api/chatApi';
import { CONVERSATIONS_KEY, CONVERSATION_MESSAGES_KEY } from '@/shared/api/queryKeys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { ConversationView } from '@/entities/chat/model/types';

describe('useConversationMutations', () => {
  const mockConv = {
    id: 'conv-1',
    type: 'DIRECT',
    name: null,
    avatar: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    unreadCount: 5,
    myMuteLevel: 'NONE',
    isPinned: false,
    participants: [
      {
        userId: 'usr-2',
        role: 'MEMBER',
        mutedUntil: null,
        joinedAt: new Date().toISOString(),
        nickname: null,
        theme: 'DEFAULT',
        muteLevel: 'NONE',
        user: {
          id: 'usr-2',
          username: 'alice',
          displayName: 'Alice',
          avatar: null,
        },
      },
    ],
  } as unknown as ConversationView;

  it('optimistically mutes conversation', async () => {
    vi.spyOn(chatApi, 'mute').mockResolvedValue({} as unknown as ConversationView);
    const queryClient = new QueryClient();
    queryClient.setQueryData([CONVERSATIONS_KEY], [mockConv]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useMuteConversation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        conversationId: 'conv-1',
        muteLevel: 'MESSAGES_AND_CALLS',
      });
    });

    const cached = queryClient.getQueryData<ConversationView[]>([CONVERSATIONS_KEY]);
    expect(cached?.[0].myMuteLevel).toBe('MESSAGES_AND_CALLS');
  });

  it('optimistically marks conversation as read', async () => {
    vi.spyOn(chatApi, 'markRead').mockResolvedValue({ success: true } as unknown as {
      success: boolean;
      unreadCount: number;
    });
    const queryClient = new QueryClient();
    queryClient.setQueryData([CONVERSATIONS_KEY], [mockConv]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useMarkConversationRead(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('conv-1');
    });

    const cached = queryClient.getQueryData<ConversationView[]>([CONVERSATIONS_KEY]);
    expect(cached?.[0].unreadCount).toBe(0);
  });

  it('clears chat history and invalidates messages and conversations cache', async () => {
    vi.spyOn(chatApi, 'clearHistory').mockResolvedValue({ success: true } as any);
    const queryClient = new QueryClient();
    queryClient.setQueryData([CONVERSATIONS_KEY], [mockConv]);
    queryClient.setQueryData([CONVERSATION_MESSAGES_KEY, 'conv-1'], {
      pages: [{ data: [{ id: 'm1' }], hasMore: false, nextCursor: null }],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useClearChatHistory(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ conversationId: 'conv-1', forAll: true });
    });

    const cachedConv = queryClient.getQueryData<ConversationView[]>([CONVERSATIONS_KEY]);
    expect(cachedConv?.[0].unreadCount).toBe(0);
  });

  it('deletes conversation and removes it from queries cache', async () => {
    vi.spyOn(chatApi, 'deleteConversation').mockResolvedValue({ success: true } as any);
    const queryClient = new QueryClient();
    queryClient.setQueryData([CONVERSATIONS_KEY], [mockConv]);

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useDeleteConversation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ conversationId: 'conv-1', forAll: false });
    });

    const cachedConv = queryClient.getQueryData<ConversationView[]>([CONVERSATIONS_KEY]);
    expect(cachedConv).toEqual([]);
  });

  it('promotes, demotes, and removes members', async () => {
    vi.spyOn(chatApi, 'promoteMember').mockResolvedValue({ success: true } as any);
    vi.spyOn(chatApi, 'demoteMember').mockResolvedValue({ success: true } as any);
    vi.spyOn(chatApi, 'removeMember').mockResolvedValue({ success: true } as any);

    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: promoteResult } = renderHook(() => usePromoteMember(), { wrapper });
    const { result: demoteResult } = renderHook(() => useDemoteMember(), { wrapper });
    const { result: removeResult } = renderHook(() => useRemoveMember(), { wrapper });

    await act(async () => {
      await promoteResult.current.mutateAsync({ conversationId: 'conv-1', userId: 'u2' });
      await demoteResult.current.mutateAsync({ conversationId: 'conv-1', userId: 'u2' });
      await removeResult.current.mutateAsync({ conversationId: 'conv-1', userId: 'u2' });
    });

    expect(chatApi.promoteMember).toHaveBeenCalledWith('conv-1', 'u2');
    expect(chatApi.demoteMember).toHaveBeenCalledWith('conv-1', 'u2');
    expect(chatApi.removeMember).toHaveBeenCalledWith('conv-1', 'u2');
  });

  it('handles archive/unarchive, block, unblock, report, setNickname, leave, updateGroup, and addMembers', async () => {
    vi.spyOn(chatApi, 'archive').mockResolvedValue({} as any);
    vi.spyOn(chatApi, 'unarchive').mockResolvedValue({} as any);
    vi.spyOn(chatApi, 'blockUser').mockResolvedValue({ success: true } as any);
    vi.spyOn(chatApi, 'unblockUser').mockResolvedValue({ success: true } as any);
    vi.spyOn(chatApi, 'reportUser').mockResolvedValue({ success: true } as any);
    vi.spyOn(chatApi, 'setNickname').mockResolvedValue({} as any);
    vi.spyOn(chatApi, 'leaveConversation').mockResolvedValue({ success: true } as any);
    vi.spyOn(chatApi, 'updateGroup').mockResolvedValue({} as any);
    vi.spyOn(chatApi, 'addMembers').mockResolvedValue({ success: true } as any);

    const queryClient = new QueryClient();
    queryClient.setQueryData([CONVERSATIONS_KEY], [mockConv]);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    // Dynamic import hook helpers
    const {
      useArchiveConversation,
      useBlockUser,
      useUnblockUser,
      useReportUser,
      useSetNickname,
      useLeaveConversation,
      useUpdateGroup,
      useAddMembers,
    } = await import('../useConversationMutations');

    const { result: archiveRes } = renderHook(() => useArchiveConversation(), { wrapper });
    const { result: blockRes } = renderHook(() => useBlockUser(), { wrapper });
    const { result: unblockRes } = renderHook(() => useUnblockUser(), { wrapper });
    const { result: reportRes } = renderHook(() => useReportUser(), { wrapper });
    const { result: nicknameRes } = renderHook(() => useSetNickname(), { wrapper });
    const { result: leaveRes } = renderHook(() => useLeaveConversation(), { wrapper });
    const { result: updateGroupRes } = renderHook(() => useUpdateGroup(), { wrapper });
    const { result: addMembersRes } = renderHook(() => useAddMembers(), { wrapper });

    await act(async () => {
      await archiveRes.current.mutateAsync({ conversationId: 'conv-1', archived: true });
      await archiveRes.current.mutateAsync({ conversationId: 'conv-1', archived: false });
      await blockRes.current.mutateAsync('usr-2');
      await unblockRes.current.mutateAsync('usr-2');
      await reportRes.current.mutateAsync({
        userId: 'usr-2',
        category: 'SPAM',
        details: 'Spamming',
      });
      await nicknameRes.current.mutateAsync({
        conversationId: 'conv-1',
        targetUserId: 'usr-2',
        nickname: 'Ali',
      });
      await leaveRes.current.mutateAsync('conv-1');
      await updateGroupRes.current.mutateAsync({ conversationId: 'conv-1', name: 'New Group' });
      await addMembersRes.current.mutateAsync({ conversationId: 'conv-1', memberIds: ['usr-3'] });
    });

    expect(chatApi.archive).toHaveBeenCalledWith('conv-1');
    expect(chatApi.unarchive).toHaveBeenCalledWith('conv-1');
    expect(chatApi.blockUser).toHaveBeenCalledWith('usr-2');
    expect(chatApi.unblockUser).toHaveBeenCalledWith('usr-2');
    expect(chatApi.reportUser).toHaveBeenCalledWith('usr-2', 'SPAM', 'Spamming');
    expect(chatApi.setNickname).toHaveBeenCalledWith('conv-1', 'usr-2', 'Ali');
    expect(chatApi.leaveConversation).toHaveBeenCalledWith('conv-1');
    expect(chatApi.updateGroup).toHaveBeenCalledWith('conv-1', {
      name: 'New Group',
      description: undefined,
    });
    expect(chatApi.addMembers).toHaveBeenCalledWith('conv-1', ['usr-3']);
  });

  it('covers useArchiveConversation onMutate (line 52) - optimistically updates isArchived', async () => {
    vi.spyOn(chatApi, 'archive').mockResolvedValue({} as any);

    const queryClient = new QueryClient();
    queryClient.setQueryData([CONVERSATIONS_KEY], [mockConv]);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { useArchiveConversation } = await import('../useConversationMutations');
    const { result } = renderHook(() => useArchiveConversation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ conversationId: 'conv-1', archived: true });
    });

    const cached = queryClient.getQueryData<any[]>([CONVERSATIONS_KEY]);
    expect(cached?.[0].isArchived).toBe(true);
  });

  it('covers useSetNickname onMutate (lines 124-131) - updates participant nickname optimistically', async () => {
    vi.spyOn(chatApi, 'setNickname').mockResolvedValue({} as any);

    const queryClient = new QueryClient();
    queryClient.setQueryData([CONVERSATIONS_KEY], [mockConv]);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { useSetNickname } = await import('../useConversationMutations');
    const { result } = renderHook(() => useSetNickname(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        conversationId: 'conv-1',
        targetUserId: 'usr-2',
        nickname: 'Allie',
      });
    });

    const cached = queryClient.getQueryData<any[]>([CONVERSATIONS_KEY]);
    expect(cached?.[0].participants[0].nickname).toBe('Allie');
  });

  it('covers useSetNickname onMutate when conversation id does not match (line 131 else branch)', async () => {
    vi.spyOn(chatApi, 'setNickname').mockResolvedValue({} as any);

    const queryClient = new QueryClient();
    queryClient.setQueryData([CONVERSATIONS_KEY], [mockConv]);
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const { useSetNickname } = await import('../useConversationMutations');
    const { result } = renderHook(() => useSetNickname(), { wrapper });

    await act(async () => {
      // Mutation for a different conversation - the map should return the original conversation
      await result.current.mutateAsync({
        conversationId: 'conv-other',
        targetUserId: 'usr-2',
        nickname: 'WontUpdate',
      });
    });

    // Original conv-1 participants should be unchanged
    const cached = queryClient.getQueryData<any[]>([CONVERSATIONS_KEY]);
    expect(cached?.[0].participants[0].nickname).toBeNull();
  });
});
