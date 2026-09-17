import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import {
  CONVERSATIONS_KEY,
  CONVERSATION_MESSAGES_KEY,
  BLOCKED_USERS_KEY,
  queryKeys,
} from '@/shared/api/queryKeys';

export { CONVERSATIONS_KEY, CONVERSATION_MESSAGES_KEY, BLOCKED_USERS_KEY };
import { ConversationView, MuteLevel } from '../../../entities/chat/model/types';

/**
 * Server State mutations: every write goes through TanStack Query with an
 * optimistic `setQueryData` patch keyed by the `queryKeys` factory, then a
 * narrow `invalidateQueries` reconcile. No direct cache literals.
 */

function useOptimisticConversationUpdate() {
  const queryClient = useQueryClient();

  return (conversationId: string, patch: Partial<ConversationView>) => {
    queryClient.setQueryData<ConversationView[]>(
      queryKeys.conversations.root,
      (prev: ConversationView[] | undefined) =>
        prev?.map((c: ConversationView) => (c.id === conversationId ? { ...c, ...patch } : c)),
    );
    queryClient.setQueryData<ConversationView>(
      queryKeys.conversations.detail(conversationId),
      (prev: ConversationView | undefined) => (prev ? { ...prev, ...patch } : prev),
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root }),
  });
}

export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, archived }: { conversationId: string; archived: boolean }) =>
      archived ? chatApi.archive(conversationId) : chatApi.unarchive(conversationId),
    onMutate: async ({ conversationId, archived }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.conversations.root });
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.detail(conversationId),
      });
      const previous = queryClient.getQueryData<ConversationView[]>(queryKeys.conversations.root);
      const previousSingle = queryClient.getQueryData<ConversationView>(
        queryKeys.conversations.detail(conversationId),
      );

      queryClient.setQueryData<ConversationView[]>(
        queryKeys.conversations.root,
        (prev: ConversationView[] | undefined) =>
          prev?.map((c: ConversationView) =>
            c.id === conversationId ? { ...c, isArchived: archived } : c,
          ),
      );

      queryClient.setQueryData<ConversationView>(
        queryKeys.conversations.detail(conversationId),
        (prev: ConversationView | undefined) => (prev ? { ...prev, isArchived: archived } : prev),
      );

      return { previous, previousSingle };
    },
    onError: (_err, vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.conversations.root, context.previous);
      }
      if (context?.previousSingle) {
        queryClient.setQueryData(
          queryKeys.conversations.detail(vars.conversationId),
          context.previousSingle,
        );
      }
    },
    onSuccess: (updatedConversation, { conversationId, archived }) => {
      queryClient.setQueryData<ConversationView[]>(
        queryKeys.conversations.root,
        (prev: ConversationView[] | undefined) =>
          prev?.map((c: ConversationView) =>
            c.id === conversationId
              ? { ...c, ...(updatedConversation ?? {}), isArchived: archived }
              : c,
          ),
      );
      queryClient.setQueryData<ConversationView>(
        queryKeys.conversations.detail(conversationId),
        (prev: ConversationView | undefined) =>
          prev ? { ...prev, ...(updatedConversation ?? {}), isArchived: archived } : prev,
      );
    },
    onSettled: (_data, _err, { conversationId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(conversationId),
      });
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => chatApi.blockUser(userId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.blocked });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => chatApi.unblockUser(userId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.blocked });
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root }),
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
        queryKeys.conversations.root,
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
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root }),
  });
}

export function useLeaveConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => chatApi.leaveConversation(conversationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root }),
  });
}

export function useAddMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, memberIds }: { conversationId: string; memberIds: string[] }) =>
      chatApi.addMembers(conversationId, memberIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root }),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.removeMember(conversationId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root }),
  });
}

export function usePromoteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.promoteMember(conversationId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root }),
  });
}

export function useDemoteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, userId }: { conversationId: string; userId: string }) =>
      chatApi.demoteMember(conversationId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root }),
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
      queryClient.setQueryData<ConversationView[]>(queryKeys.conversations.root, (prev) =>
        prev?.filter((c) => c.id !== conversationId),
      );
    },
    onSettled: (_data, _error, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });
      queryClient.removeQueries({
        queryKey: queryKeys.conversations.messages(conversationId),
      });
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
      queryClient.setQueryData(queryKeys.conversations.messages(conversationId), {
        pages: [{ data: [], hasMore: false, nextCursor: null }],
        pageParams: [undefined],
      });
      queryClient.setQueryData<ConversationView[]>(queryKeys.conversations.root, (prev) =>
        prev?.map((c) =>
          c.id === conversationId ? { ...c, lastMessage: null, unreadCount: 0 } : c,
        ),
      );
    },
    onSettled: (_data, _error, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.root });
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(conversationId),
      });
    },
  });
}
