import React, { useState, useMemo } from 'react';
import { X, Check, UserX, UserCheck, Search, Bookmark, Users, CheckCircle2 } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import Modal from '../../../shared/ui/Modal';
import { useConversations } from '../model/useConversations';
import { getConversationDisplay } from '../lib/getConversationDisplay';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { usePresenceStore } from '@/shared/model/usePresenceStore';
import { ChatFolder, systemChatFolders, useChatFoldersStore } from '../model/useChatFoldersStore';
import { getFolderConversations } from '../lib/chatFolderUtils';
import ChatFolderIcon from './ChatFolderIcon';
import { chatApi } from '../api/chatApi';
import type { ConversationView } from '../../../entities/chat/model/types';
import type { ChatThemeConfig } from '../model/chatTheme';

interface ForwardMessageModalProps {
  messageCount?: number;
  onClose: () => void;
  onForward: (conversationIds: string[], hideAuthor: boolean) => void;
  chatTheme?: ChatThemeConfig | null;
}

export default function ForwardMessageModal({
  messageCount = 1,
  onClose,
  onForward,
  chatTheme,
}: ForwardMessageModalProps) {
  const { data: conversations } = useConversations();
  const userId = useAuthStore((s) => s.userId);
  const onlineUserIds = usePresenceStore((s) => s.onlineUserIds);

  const systemFolders = useChatFoldersStore((s) => s.systemFolders);
  const folders = useChatFoldersStore((s) => s.folders);
  const folderOrders = useChatFoldersStore((s) => s.folderOrders);
  const folderOrderOwnerId = userId ?? 'guest';

  // Folders order mirroring ChatListPanel exactly
  const allFolders = useMemo(() => {
    const baseFolders = [...systemFolders, ...folders];
    const order = folderOrders[folderOrderOwnerId] ?? [];
    const byId = new Map(baseFolders.map((folder) => [folder.id, folder]));
    const ordered = order
      .map((id) => byId.get(id))
      .filter((folder): folder is ChatFolder => Boolean(folder));
    const remaining = baseFolders.filter((folder) => !order.includes(folder.id));
    return [...ordered, ...remaining];
  }, [folderOrderOwnerId, folderOrders, folders, systemFolders]);

  const effectiveFolders = useMemo(() => {
    return allFolders.length > 0 ? allFolders : systemChatFolders;
  }, [allFolders]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hideAuthor, setHideAuthor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active folder matching ChatListPanel resolution
  const activeFolder = useMemo(() => {
    return (
      effectiveFolders.find(
        (f) =>
          f.id === activeFolderId ||
          (activeFolderId === 'all' && (f.id === 'all' || f.filterType === 'ALL')),
      ) ?? effectiveFolders[0]
    );
  }, [activeFolderId, effectiveFolders]);

  const emptySet = useMemo(() => new Set<string>(), []);

  // Compute conversation count for each folder
  const folderCounts = useMemo(() => {
    if (!conversations) return {};
    const map: Record<string, number> = {};
    for (const folder of effectiveFolders) {
      map[folder.id] = getFolderConversations(folder, conversations, emptySet).length;
    }
    return map;
  }, [conversations, effectiveFolders, emptySet]);

  // Find or identify the user's self conversation for "Saved Messages"
  const selfConversation = useMemo(() => {
    if (!conversations || !userId) return null;
    return conversations.find((c: ConversationView) => {
      if (c.type !== 'DIRECT') return false;
      const other = c.participants?.find((p) => p.userId !== userId);
      return !other || c.participants.every((p) => p.userId === userId);
    });
  }, [conversations, userId]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  // Filter conversations by active folder & search query
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    const inFolder = activeFolder
      ? getFolderConversations(activeFolder, conversations, emptySet)
      : conversations;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return inFolder;

    return inFolder.filter((c: ConversationView) => {
      const display = getConversationDisplay(c, userId);
      const titleMatch = display.title.toLowerCase().includes(q);
      const userMatch = display.otherUsername?.toLowerCase().includes(q);
      return titleMatch || userMatch;
    });
  }, [conversations, activeFolder, emptySet, searchQuery, userId]);

  // Determine whether Saved Messages should be displayed in current folder view
  const isSavedFolder = useMemo(() => {
    if (!activeFolder) return true;
    const filterType = activeFolder.filterType?.toUpperCase();
    const id = activeFolder.id?.toLowerCase();
    const name = activeFolder.name?.toLowerCase();
    return (
      filterType === 'ALL' ||
      filterType === 'PERSONAL' ||
      id === 'all' ||
      id === 'personal' ||
      name.includes('all') ||
      name.includes('personal')
    );
  }, [activeFolder]);

  // Handle final forward action (resolves Saved Messages creation if needed)
  const handleConfirmForward = async (close: () => void) => {
    if (selected.size === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const targetIds = Array.from(selected);

      // If user selected virtual 'saved-messages' and self conversation wasn't created yet
      const finalIds: string[] = [];
      for (const id of targetIds) {
        if (id === 'virtual-saved-messages') {
          if (selfConversation) {
            finalIds.push(selfConversation.id);
          } else if (userId) {
            const created = await chatApi.createDirectConversation(userId);
            finalIds.push(created.id);
          }
        } else {
          finalIds.push(id);
        }
      }

      onForward(finalIds, hideAuthor);
      close();
    } catch {
      // Fallback with currently selected ids
      onForward(Array.from(selected), hideAuthor);
      close();
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerTitle = messageCount > 1 ? `Forward ${messageCount} messages` : 'Forward message';

  // Dynamic theme accent styling
  const accentGradient = useMemo(() => {
    if (chatTheme?.bubbleType === 'gradient' && chatTheme.bubbleGradientColors?.length) {
      return `linear-gradient(${chatTheme.bubbleGradientAngle ?? 135}deg, ${chatTheme.bubbleGradientColors.join(', ')})`;
    }
    if (chatTheme?.bubbleType === 'solid' && chatTheme.bubbleColor) {
      return chatTheme.bubbleColor;
    }
    return 'linear-gradient(135deg, #9333ea, #6366f1)';
  }, [chatTheme]);

  const isSavedSelected =
    (selfConversation && selected.has(selfConversation.id)) ||
    selected.has('virtual-saved-messages');

  const toggleSavedMessages = () => {
    if (selfConversation) {
      toggle(selfConversation.id);
    } else {
      toggle('virtual-saved-messages');
    }
  };

  return (
    <Modal onClose={onClose} className="w-full max-w-md max-h-[85vh] flex flex-col">
      {(close) => (
        <div className="w-full bg-[#181920]/95 border border-white/10 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col max-h-[85vh] overflow-hidden select-none animate-modalPop">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
              title="Close"
            >
              <X size={18} />
            </button>

            <h2 className="text-base font-bold text-white tracking-tight text-center">
              {headerTitle}
            </h2>

            {/* Telegram-style Quick Send Checkmark Icon Button */}
            <button
              type="button"
              disabled={selected.size === 0 || isSubmitting}
              onClick={() => handleConfirmForward(close)}
              title={selected.size > 0 ? `Send to ${selected.size} chats` : 'Select chat'}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 ${
                selected.size > 0
                  ? 'text-white hover:opacity-90 shadow-md'
                  : 'text-gray-600 opacity-40 cursor-not-allowed'
              }`}
              style={{
                background: selected.size > 0 ? accentGradient : 'transparent',
              }}
            >
              <CheckCircle2 size={18} />
            </button>
          </div>

          {/* Search Input Bar (Telegram-style) */}
          <div className="px-5 py-1.5 flex-shrink-0">
            <div className="flex items-center px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 focus-within:bg-white/10 border border-white/5 focus-within:border-white/20 transition-all">
              <Search size={16} className="text-gray-400 mr-2.5 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (searchQuery) {
                      setSearchQuery('');
                    } else {
                      close();
                    }
                  }
                }}
                className="w-full bg-transparent text-sm text-white placeholder-gray-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Category / Folder Tabs matching ChatListPanel */}
          <div className="flex items-center gap-1.5 px-5 py-2 overflow-x-auto custom-scrollbar flex-shrink-0 text-xs select-none">
            {effectiveFolders.map((folder) => {
              const isActive =
                activeFolder?.id === folder.id ||
                (activeFolderId === 'all' && (folder.id === 'all' || folder.filterType === 'ALL'));
              const count = folderCounts[folder.id] ?? 0;

              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setActiveFolderId(folder.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all active:scale-95 cursor-pointer ${
                    isActive
                      ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <ChatFolderIcon
                    iconKey={folder.icon}
                    emoji={folder.emoji}
                    color={isActive ? '#c084fc' : folder.color}
                    size={13}
                  />
                  <span className="truncate max-w-[120px]">{folder.name}</span>
                  <span className="text-[11px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-1 flex flex-col gap-1 min-h-[160px]">
            {/* Telegram-style Top Item: Saved Messages */}
            {isSavedFolder &&
              (!searchQuery || 'saved messages'.includes(searchQuery.toLowerCase())) && (
                <button
                  type="button"
                  onClick={toggleSavedMessages}
                  className={`w-full flex items-center justify-between p-2 rounded-2xl transition-all cursor-pointer ${
                    isSavedSelected ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/25 flex-shrink-0">
                      <Bookmark size={20} className="fill-white" />
                    </div>
                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-sm font-semibold text-white leading-tight truncate">
                        Saved Messages
                      </span>
                      <span className="text-xs text-gray-400 leading-tight mt-0.5 truncate">
                        forward here to save
                      </span>
                    </div>
                  </div>

                  {/* Circular Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isSavedSelected
                        ? 'text-white scale-105 shadow-md border border-white/20'
                        : 'border-2 border-white/20 hover:border-white/40'
                    }`}
                    style={{
                      background: isSavedSelected ? accentGradient : 'transparent',
                    }}
                  >
                    {isSavedSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              )}

            {/* Filtered Conversations */}
            {filteredConversations.map((c: ConversationView) => {
              const display = getConversationDisplay(c, userId);
              const isSelected = selected.has(c.id);
              const isOnline = display.otherUserId ? onlineUserIds.has(display.otherUserId) : false;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-2xl transition-all cursor-pointer ${
                    isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <Avatar
                        size="md"
                        src={display.avatar}
                        decoration={display.activeDecoration}
                        userId={display.otherUserId}
                        className="w-11 h-11"
                      />
                      {isOnline && !display.isGroup && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#181920]" />
                      )}
                      {display.isGroup && (
                        <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-purple-600/90 text-white flex items-center justify-center text-[9px] border border-[#181920]">
                          <Users size={10} />
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col text-left min-w-0">
                      <span className="text-sm font-semibold text-white leading-tight truncate">
                        {display.title}
                      </span>
                      <span className="text-xs text-gray-400 leading-tight mt-0.5 truncate">
                        {display.isGroup
                          ? `${c.participants?.length || 0} members`
                          : isOnline
                            ? 'online'
                            : 'last seen recently'}
                      </span>
                    </div>
                  </div>

                  {/* Circular Checkbox */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected
                        ? 'text-white scale-105 shadow-md border border-white/20'
                        : 'border-2 border-white/20 hover:border-white/40'
                    }`}
                    style={{
                      background: isSelected ? accentGradient : 'transparent',
                    }}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              );
            })}

            {filteredConversations.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400">No chats found</div>
            )}
          </div>

          {/* Telegram-style "Hide author name" toggle */}
          <div className="px-5 pt-2.5 pb-1.5 flex-shrink-0 border-t border-white/5">
            <button
              type="button"
              onClick={() => setHideAuthor((v) => !v)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                  {hideAuthor ? (
                    <UserX size={16} className="text-rose-400" />
                  ) : (
                    <UserCheck size={16} className="text-purple-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-200 leading-tight">
                    {hideAuthor ? 'Sender name hidden' : 'Show sender name'}
                  </p>
                  <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                    {hideAuthor ? 'Forwarded as your message' : 'Author name will be shown'}
                  </p>
                </div>
              </div>
              <div
                className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                  hideAuthor ? 'justify-end' : 'bg-white/20 justify-start'
                }`}
                style={{
                  background: hideAuthor ? accentGradient : undefined,
                }}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </div>
            </button>
          </div>

          {/* Bottom Forward Action Button */}
          <div className="px-5 pb-5 pt-2 flex-shrink-0">
            <button
              type="button"
              disabled={selected.size === 0 || isSubmitting}
              onClick={() => handleConfirmForward(close)}
              style={{
                background: selected.size > 0 ? accentGradient : undefined,
              }}
              className="w-full py-3 rounded-full text-sm font-bold text-white transition-all active:scale-[0.98] shadow-lg disabled:bg-white/10 disabled:text-gray-500 disabled:shadow-none cursor-pointer"
            >
              Forward {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
