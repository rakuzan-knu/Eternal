import { ConversationView } from '../../../entities/chat/model/types';
import { ChatFolder } from '../model/useChatFoldersStore';

export function getFolderConversations(
  folder: ChatFolder,
  conversations: ConversationView[],
  forcedUnreadIds: Set<string>,
) {
  const active = conversations.filter((conversation) => !conversation.isArchived);

  if (folder.id === 'unread') {
    return active.filter(
      (conversation) => conversation.unreadCount > 0 || forcedUnreadIds.has(conversation.id),
    );
  }

  if (folder.id === 'groups') {
    return active.filter((conversation) => conversation.type === 'GROUP');
  }

  if (folder.isSystem || folder.id === 'all') return active;

  const included = new Set(folder.includeIds);
  const excluded = new Set(folder.excludeIds);
  return active.filter(
    (conversation) => included.has(conversation.id) && !excluded.has(conversation.id),
  );
}

export function getFolderUnreadCount(
  folder: ChatFolder,
  conversations: ConversationView[],
  forcedUnreadIds: Set<string>,
) {
  return getFolderConversations(folder, conversations, forcedUnreadIds).reduce(
    (total, conversation) =>
      total + Math.max(conversation.unreadCount, forcedUnreadIds.has(conversation.id) ? 1 : 0),
    0,
  );
}
