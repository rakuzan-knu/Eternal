import { ConversationView } from '../../../entities/chat/model/types';
import { ChatFolder } from '../model/useChatFoldersStore';

export function getFolderConversations(
  folder: ChatFolder,
  conversations: ConversationView[],
  forcedUnreadIds: Set<string>,
): ConversationView[] {
  const active = conversations.filter((conversation) => !conversation.isArchived);
  const normalizedId = folder.id?.toLowerCase();
  const filterType = folder.filterType?.toUpperCase();
  const normalizedName = folder.name?.toLowerCase().trim();

  const included = new Set(folder.includeIds ?? []);
  const excluded = new Set(folder.excludeIds ?? []);

  const isNotExcluded = (conversation: ConversationView) => !excluded.has(conversation.id);

  // 1. UNREAD filter: Only chats with unread messages or forced unread
  if (filterType === 'UNREAD' || normalizedId === 'unread' || normalizedName === 'unread') {
    return active.filter(
      (c) =>
        isNotExcluded(c) && (c.unreadCount > 0 || forcedUnreadIds.has(c.id) || included.has(c.id)),
    );
  }

  // 2. GROUPS filter: Strictly ONLY group conversations (never 1-on-1 direct chats)
  if (filterType === 'GROUPS' || normalizedId === 'groups' || normalizedName === 'groups') {
    return active.filter((c) => isNotExcluded(c) && c.type === 'GROUP');
  }

  // 3. PERSONAL filter: Strictly ONLY 1-on-1 direct conversations (never groups)
  if (filterType === 'PERSONAL' || normalizedId === 'personal' || normalizedName === 'personal') {
    return active.filter((c) => isNotExcluded(c) && c.type === 'DIRECT');
  }

  // 4. ALL CHATS filter: All active non-archived conversations
  if (
    filterType === 'ALL' ||
    normalizedId === 'all' ||
    normalizedName === 'all' ||
    normalizedName === 'all chats'
  ) {
    return active.filter(isNotExcluded);
  }

  // 5. Custom folders: filtered by inclusion list
  if (included.size > 0) {
    return active.filter((c) => included.has(c.id) && isNotExcluded(c));
  }

  if (excluded.size > 0) {
    return active.filter(isNotExcluded);
  }

  if (folder.isSystem) {
    return active;
  }

  return [];
}

export function getFolderUnreadCount(
  folder: ChatFolder,
  conversations: ConversationView[],
  forcedUnreadIds: Set<string>,
): number {
  return getFolderConversations(folder, conversations, forcedUnreadIds).reduce(
    (total, conversation) =>
      total + Math.max(conversation.unreadCount, forcedUnreadIds.has(conversation.id) ? 1 : 0),
    0,
  );
}
