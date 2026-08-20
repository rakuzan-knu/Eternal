import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import {
  CONVERSATIONS_KEY,
  CONVERSATION_MESSAGES_KEY,
  BLOCKED_USERS_KEY,
} from '@/shared/api/queryKeys';

export { CONVERSATIONS_KEY, CONVERSATION_MESSAGES_KEY, BLOCKED_USERS_KEY };
import { ConversationView, MuteLevel } from '../../../entities/chat/model/types';

function useOptimisticConversationUpdate() {
  const queryClient = useQueryClient();

  return (conversationId: string, patch: Partial<ConversationView>) => {
    queryClient.setQueryData<ConversationView[]>(
      [CONVERSATIONS_KEY],
      (prev: ConversationView[] | undefined) =>
        prev?.map((c: ConversationView) => (c.id === conversationId ? { ...c, ...patch } : c)),
    );
  };
}

export function useMuteConversation() {
  const queryClient = useQueryClient();
  const applyOptimistic = useOptimisticConversationUpdate();

  return useMutation({
    mutationFn: ({
      conversationId,
      muteLevel,
      mutedUntil,
    }: {
      conversationId: string;
      muteLevel: MuteLevel;
      mutedUntil?: string;
    }) => chatApi.mute(conversationId, muteLevel, mutedUntil),
    onMutate: ({ conversationId, muteLevel, mutedUntil }) =>
      applyOptimistic(conversationId, { myMuteLevel: muteLevel, myMutedUntil: mutedUntil ?? null }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] }),
  });
}

export function useArchiveConversation() {
  const queryClient = useQueryClient();
  const applyOptimistic = useOptimisticConversationUpdate();

  return useMutation({
    mutationFn: ({ conversationId, archived }: { conversationId: string; archived: boolean }) =>
      archived ? chatApi.archive(conversationId) : chatApi.unarchive(conversationId),
    onMutate: ({ conversationId, archived }) =>
      applyOptimistic(conversationId, { isArchived: archived }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] }),
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => chatApi.blockUser(userId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [BLOCKED_USERS_KEY] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => chatApi.unblockUser(userId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [BLOCKED_USERS_KEY] });
    },
  });
}

export function useReportUser() {
  return useMutation({
    mutationFn: ({
      userId,
      category,
      details,
    }: {
      userId: string;
      category: string;
      details?: string;
    }) => chatApi.reportUser(userId, category, details),
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  const applyOptimistic = useOptimisticConversationUpdate();

  return useMutation({
    mutationFn: (conversationId: string) => chatApi.markRead(conversationId),
    onMutate: (conversationId) => applyOptimistic(conversationId, { unreadCount: 0 }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] }),
  });
}

export function useSetNickname() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      targetUserId,
      nickname,
    }: {
      conversationId: string;
      targetUserId: string;
      nickname: string | null;
    }) => chatApi.setNickname(conversationId, targetUserId, nickname),
    onMutate: ({ conversationId, targetUserId, nickname }) => {
      queryClient.setQueryData<ConversationView[]>(
        [CONVERSATIONS_KEY],
        (prev: ConversationView[] | undefined) =>
          prev?.map((c: ConversationView) =>
            c.id === conversationId
              ? {
                  ...c,
                  participants: c.participants.map((p: ConversationView['participants'][number]) =>
                    p.userId === targetUserId ? { ...p, nickname } : p,
                  ),
                }
              : c,
          ),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] }),
  });
}

export function useLeaveConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.leaveConversation(conversationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] }),
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversationId,
      name,
      description,
    }: {
      conversationId: string;
      name?: string;
      description?: string;
    }) => chatApi.updateGroup(conversationId, { name, description }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] }),
  });
}

export function useAddMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, memberIds }: { conversationId: string; memberIds: string[] }) =>
      chatApi.addMembers(conversationId, memberIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] }),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.removeMember(conversationId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] }),
  });
}

export function usePromoteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.promoteMember(conversationId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] }),
  });
}

export function useDemoteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.demoteMember(conversationId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] }),
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      forAll = false,
    }: {
      conversationId: string;
      forAll?: boolean;
    }) => chatApi.deleteConversation(conversationId, forAll),
    onMutate: ({ conversationId }) => {
      queryClient.setQueryData<ConversationView[]>([CONVERSATIONS_KEY], (prev) =>
        prev?.filter((c) => c.id !== conversationId),
      );
    },
    onSettled: (_data, _error, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      queryClient.removeQueries({ queryKey: [CONVERSATION_MESSAGES_KEY, conversationId] });
    },
  });
}

export function useClearChatHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      forAll = false,
    }: {
      conversationId: string;
      forAll?: boolean;
    }) => chatApi.clearHistory(conversationId, forAll),
    onMutate: ({ conversationId }) => {
      queryClient.setQueryData([CONVERSATION_MESSAGES_KEY, conversationId], {
        pages: [{ data: [], hasMore: false, nextCursor: null }],
        pageParams: [undefined],
      });
      queryClient.setQueryData<ConversationView[]>([CONVERSATIONS_KEY], (prev) =>
        prev?.map((c) =>
          c.id === conversationId ? { ...c, lastMessage: null, unreadCount: 0 } : c,
        ),
      );
    },
    onSettled: (_data, _error, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONVERSATION_MESSAGES_KEY, conversationId] });
    },
  });
}
