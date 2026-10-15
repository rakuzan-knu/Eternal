import type { ConversationPageQuery } from '@social-network/shared-contracts';
import type { ChatFolder } from '../model/useChatFoldersStore';

/** Mirrors getFolderConversations, including strict personal/group folders. */
export function conversationFolderQuery(
  folder?: ChatFolder | null,
): Partial<ConversationPageQuery> {
  if (!folder) return { filter: 'ALL' };
  const type = folder.filterType?.toUpperCase();
  const name = folder.name.toLowerCase().trim();
  const id = folder.id.toLowerCase();
  const matches = (value: string) => type === value.toUpperCase() || id === value || name === value;
  const filter = matches('unread')
    ? 'UNREAD'
    : matches('groups')
      ? 'GROUPS'
      : matches('personal')
        ? 'PERSONAL'
        : matches('all') || name === 'all chats'
          ? 'ALL'
          : folder.includeIds.length
            ? 'CUSTOM'
            : folder.excludeIds.length || folder.isSystem
              ? 'ALL'
              : 'EMPTY';
  return {
    filter,
    includeIds: [...folder.includeIds].sort(),
    excludeIds: [...folder.excludeIds].sort(),
    ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(folder.id)
      ? { folderId: folder.id }
      : {}),
  };
}
