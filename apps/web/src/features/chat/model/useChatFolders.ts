import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { queryKeys } from '@/shared/api/queryKeys';
import { queryStaleTimes } from '@/shared/api/queryClient';
import type {
  ChatFolderView,
  ConversationView,
  CreateFolderPayload,
  UpdateFolderPayload,
} from '../../../entities/chat/model/types';

export const CHAT_FOLDERS_QUERY_KEY = queryKeys.conversations.folders;

export function useChatFolders() {
  return useQuery({
    queryKey: queryKeys.conversations.folders,
    queryFn: () => chatApi.getFolders(),
    staleTime: queryStaleTimes.feed,
  });
}

export function useCreateChatFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFolderPayload) => chatApi.createFolder(payload),
    onSuccess: (newFolder) => {
      queryClient.setQueryData<ChatFolderView[]>(CHAT_FOLDERS_QUERY_KEY, (prev) =>
        prev ? [...prev, newFolder] : [newFolder],
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CHAT_FOLDERS_QUERY_KEY });
    },
  });
}

export function useUpdateChatFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFolderPayload }) =>
      chatApi.updateFolder(id, payload),
    onSuccess: (updatedFolder) => {
      queryClient.setQueryData<ChatFolderView[]>(CHAT_FOLDERS_QUERY_KEY, (prev) =>
        prev?.map((f) => (f.id === updatedFolder.id ? updatedFolder : f)),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CHAT_FOLDERS_QUERY_KEY });
    },
  });
}

export function useDeleteChatFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => chatApi.deleteFolder(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: CHAT_FOLDERS_QUERY_KEY });
      const previous = queryClient.getQueryData<ChatFolderView[]>(CHAT_FOLDERS_QUERY_KEY);
      queryClient.setQueryData<ChatFolderView[]>(CHAT_FOLDERS_QUERY_KEY, (prev) =>
        prev?.filter((f) => f.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CHAT_FOLDERS_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CHAT_FOLDERS_QUERY_KEY });
    },
  });
}

export function useReorderChatFolders() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderIds: string[]) => chatApi.reorderFolders(folderIds),
    onMutate: async (folderIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: CHAT_FOLDERS_QUERY_KEY });
      const previous = queryClient.getQueryData<ChatFolderView[]>(CHAT_FOLDERS_QUERY_KEY);
      if (previous) {
        const map = new Map(previous.map((f) => [f.id, f]));
        const reordered = folderIds
          .map((id, index) => {
            const f = map.get(id);
            return f ? { ...f, order: index } : null;
          })
          .filter((f): f is ChatFolderView => f !== null);
        queryClient.setQueryData<ChatFolderView[]>(CHAT_FOLDERS_QUERY_KEY, reordered);
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CHAT_FOLDERS_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CHAT_FOLDERS_QUERY_KEY });
    },
  });
}

export function filterConversationsByFolder(
  conversations: ConversationView[],
  folder: ChatFolderView | null,
): ConversationView[] {
  if (!folder || folder.filterType === 'ALL') {
    return conversations;
  }

  return conversations.filter((c) => {
    // Check exclusions first
    if (folder.excludeIds && folder.excludeIds.includes(c.id)) {
      return false;
    }

    // Check explicit inclusions
    if (folder.includeIds && folder.includeIds.includes(c.id)) {
      return true;
    }

    switch (folder.filterType) {
      case 'PERSONAL':
        return c.type === 'DIRECT';
      case 'GROUPS':
        return c.type === 'GROUP';
      case 'UNREAD':
        return (c.unreadCount ?? 0) > 0;
      case 'WORK':
        // Include direct and groups with work keyword or explicit inclusions
        return (
          c.name?.toLowerCase().includes('work') ||
          c.name?.toLowerCase().includes('job') ||
          c.name?.toLowerCase().includes('project') ||
          c.name?.toLowerCase().includes('team')
        );
      case 'CUSTOM':
        return folder.includeIds ? folder.includeIds.includes(c.id) : true;
      default:
        return true;
    }
  });
}
