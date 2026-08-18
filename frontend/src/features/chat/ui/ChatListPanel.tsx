import React, { useMemo, useState } from 'react';
import { Search, UserPlus, MoreHorizontal, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useUIStore } from '../../../shared/model/useUIStore';
import { useAuthStore } from '../../../shared/model/useAuthStore';
import Tooltip from '../../../shared/ui/Tooltip';
import { useMessageToastStore } from '../../../shared/model/useMessageToastStore';
import { ConversationView } from '../../../entities/chat/model/types';
import { useConversations } from '../../../features/chat/model/useConversations';
import { useQueryOnlineStatus } from '../../../features/chat/model/usePresence';
import { useResizablePanel } from '../../../features/chat/model/useResizablePanel';
import { useLocalConversationOverrides } from '../../../features/chat/model/useLocalConversationOverrides';
import { getConversationDisplay } from '../../../features/chat/lib/getConversationDisplay';
import { getFolderConversations } from '../../../features/chat/lib/chatFolderUtils';
import { ChatFolder, useChatFoldersStore } from '../../../features/chat/model/useChatFoldersStore';
import { useChatDraftsStore } from '../../../features/chat/model/useChatDraftsStore';
import ChatListItem from './ChatListItem';
import ChatListHeaderMenu, { ChatListHeaderSection } from './ChatListHeaderMenu';
import NewGroupModal from './NewGroupModal';
import ChatFolderModal from './ChatFolderModal';
import ChatFolderRail from './ChatFolderRail';
import ChatFolderContextMenu from './ChatFolderContextMenu';
import DeleteChatFolderModal from './DeleteChatFolderModal';
import ArchivedChatsModal from './ArchivedChatsModal';
import RestrictedAccountsPanel from './RestrictedAccountsPanel';
import { ChatListSkeleton, ChatListMoreSkeleton } from './ChatListSkeletons';

const MIN_WIDTH = 280;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 360;
const COLLAPSED_WIDTH = 64;
const CHAT_RENDER_BATCH_SIZE = 20;

function getConversationActivityTime(conversation: ConversationView) {
  const activityAt =
    conversation.lastMessage?.createdAt ?? conversation.updatedAt ?? conversation.createdAt;
  const time = new Date(activityAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

interface ChatListPanelProps {
  onSelectConversation: (conversationId: string) => void;
  activeConversationId: string | null;
}

export default function ChatListPanel({
  onSelectConversation,
  activeConversationId,
}: ChatListPanelProps) {
  const { isChatListExpanded, toggleChatList, openEditProfile } = useUIStore();
  const { userId } = useAuthStore();
  const { data: conversations, isLoading, isError } = useConversations();
  const {
    systemFolders,
    folders,
    folderOrders,
    addFolder,
    updateFolder,
    deleteFolder,
    reorderFolders,
  } = useChatFoldersStore();
  const folderOrderOwnerId = userId ?? 'guest';
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
  const visibleDirectUserIds = useMemo<string[]>(
    () =>
      conversations
        ?.filter((c: ConversationView) => c.type === 'DIRECT')
        .map((c: ConversationView) => getConversationDisplay(c, userId).otherUserId)
        .filter((id: string | null | undefined): id is string => Boolean(id)) ?? [],
    [conversations, userId],
  );
  useQueryOnlineStatus(visibleDirectUserIds);

  const [search, setSearch] = useState('');
  const [activeFolderId, setActiveFolderId] = useState('all');
  const [isHeaderMenuOpen, setHeaderMenuOpen] = useState(false);
  const [isNewGroupModalOpen, setNewGroupModalOpen] = useState(false);
  const [isArchiveModalOpen, setArchiveModalOpen] = useState(false);
  const [isRestrictedOpen, setRestrictedOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<ChatFolder | null>(null);
  const [isFolderModalOpen, setFolderModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    folder: ChatFolder;
    x: number;
    y: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatFolder | null>(null);
  const [visibleConversationCount, setVisibleConversationCount] = useState(CHAT_RENDER_BATCH_SIZE);

  const {
    pinnedLocally,
    forcedUnreadLocally,
    locallyReadConversations,
    togglePinLocally,
    toggleUnreadLocally,
    markConversationsRead,
  } = useLocalConversationOverrides();

  const handleTogglePinLocally = (conversationId: string) => {
    togglePinLocally(conversationId, () => {
      useMessageToastStore.getState().addToast({
        id: `pin-limit-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Pin Limit Reached',
        body: 'You can pin a maximum of 5 chats.',
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    });
  };

  const { width, isResizing, isHandleHovered, setIsHandleHovered, handleResizeStart } =
    useResizablePanel(MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH);

  const effectiveConversations = useMemo<ConversationView[]>(
    () =>
      conversations?.map((conversation: ConversationView) =>
        locallyReadConversations.has(conversation.id)
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ) ?? [],
    [conversations, locallyReadConversations],
  );

  const activeFolder = useMemo(
    () => allFolders.find((folder) => folder.id === activeFolderId) ?? allFolders[0],
    [activeFolderId, allFolders],
  );

  const drafts = useChatDraftsStore((s) => s.drafts);

  const filteredConversations = useMemo(() => {
    if (!activeFolder) return [];
    return getFolderConversations(activeFolder, effectiveConversations, forcedUnreadLocally)
      .filter((c: ConversationView) =>
        getConversationDisplay(c, userId).title.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => {
        const hasDraftA = Boolean(drafts[a.id]?.text?.trim());
        const hasDraftB = Boolean(drafts[b.id]?.text?.trim());
        if (hasDraftA !== hasDraftB) {
          return hasDraftA ? -1 : 1;
        }
        return getConversationActivityTime(b) - getConversationActivityTime(a);
      });
  }, [activeFolder, drafts, effectiveConversations, forcedUnreadLocally, search, userId]);

  const visibleConversations = filteredConversations.slice(0, visibleConversationCount);
  const visiblePinnedConversations = visibleConversations.filter((c) => pinnedLocally.has(c.id));
  const visibleUnpinnedConversations = visibleConversations.filter((c) => !pinnedLocally.has(c.id));
  const hasMoreVisibleConversations = visibleConversationCount < filteredConversations.length;

  const [visibleCountResetKey, setVisibleCountResetKey] = useState(`${activeFolderId}:${search}`);
  const currentVisibleCountKey = `${activeFolderId}:${search}`;
  if (currentVisibleCountKey !== visibleCountResetKey) {
    setVisibleCountResetKey(currentVisibleCountKey);
    setVisibleConversationCount(CHAT_RENDER_BATCH_SIZE);
  }

  const handleChatListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight > 160) return;
    setVisibleConversationCount((count) =>
      Math.min(count + CHAT_RENDER_BATCH_SIZE, filteredConversations.length),
    );
  };

  const archivedCount = useMemo(
    () => conversations?.filter((c: ConversationView) => c.isArchived).length ?? 0,
    [conversations],
  );

  const handleOpenHeaderSection = (section: ChatListHeaderSection) => {
    if (section === 'archive') {
      setArchiveModalOpen(true);
      return;
    }
    if (section === 'restricted') {
      setRestrictedOpen(true);
      return;
    }
    if (section === 'settings') {
      openEditProfile('account');
      return;
    }
    if (section === 'privacy') {
      openEditProfile('privacy');
      return;
    }
    // TODO: wire the remaining sections to real routes/modals once they exist
    console.log('open section:', section);
  };

  const handleCreateFolder = () => {
    setEditingFolder(null);
    setFolderModalOpen(true);
  };

  const handleEditFolder = (folder: ChatFolder) => {
    setEditingFolder(folder);
    setFolderModalOpen(true);
    setContextMenu(null);
  };

  const handleMarkFolderRead = (folder: ChatFolder) => {
    const folderConversationIds = getFolderConversations(
      folder,
      effectiveConversations,
      forcedUnreadLocally,
    ).map((conversation) => conversation.id);
    markConversationsRead(folderConversationIds);
    setContextMenu(null);
  };

  const handleSaveFolder = (folder: Omit<ChatFolder, 'id' | 'isSystem'>) => {
    if (editingFolder) {
      updateFolder(editingFolder.id, folder);
      setActiveFolderId(editingFolder.id);
    } else {
      setActiveFolderId(addFolder(folder));
    }
    setFolderModalOpen(false);
    setEditingFolder(null);
  };

  return (
    <div
      style={{
        width: isChatListExpanded ? width : COLLAPSED_WIDTH,
        transitionDuration: isResizing ? '0ms' : '300ms',
      }}
      className="relative h-full flex-shrink-0 flex flex-col bg-[#16161a]/60 backdrop-blur-2xl border-r border-white/5 py-6 transition-[width] ease-in-out overflow-hidden"
    >
      {!isChatListExpanded ? (
        <div className="h-full flex flex-col items-center pt-0 gap-4">
          <Tooltip label="Open side panel" position="right">
            <button
              onClick={toggleChatList}
              aria-label="Open side panel"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <PanelLeftOpen size={20} />
            </button>
          </Tooltip>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-5 mb-5 whitespace-nowrap">
            <div className="flex items-center gap-2">
              <Tooltip label="Close side panel" position="bottom">
                <button
                  onClick={toggleChatList}
                  aria-label="Close side panel"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <PanelLeftClose size={18} />
                </button>
              </Tooltip>
              <h1 className="text-xl font-bold text-white">Chats</h1>
            </div>

            <div className="flex items-center gap-1 relative">
              <button
                onClick={() => setHeaderMenuOpen((v) => !v)}
                aria-label="More options"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <MoreHorizontal size={20} />
              </button>
              {isHeaderMenuOpen && (
                <ChatListHeaderMenu
                  onClose={() => setHeaderMenuOpen(false)}
                  archivedCount={archivedCount}
                  onOpen={handleOpenHeaderSection}
                />
              )}
              <button
                onClick={() => setNewGroupModalOpen(true)}
                title="New group chat"
                aria-label="New group chat"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <UserPlus size={20} />
              </button>
            </div>
          </div>

          <div className="px-5 mb-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                value={search}
                maxLength={100}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search in Messenger"
                className="w-full h-10 pl-10 pr-4 rounded-full bg-white/5 border border-white/5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          <ChatFolderRail
            folders={allFolders}
            conversations={effectiveConversations}
            activeFolderId={activeFolder?.id ?? 'all'}
            forcedUnreadIds={forcedUnreadLocally}
            onSelect={setActiveFolderId}
            onCreate={handleCreateFolder}
            onContextMenu={(folder, x, y) => setContextMenu({ folder, x, y })}
            onReorder={(orderedIds) => reorderFolders(folderOrderOwnerId, orderedIds)}
          />

          <div className="flex-1 overflow-y-auto px-3" onScroll={handleChatListScroll}>
            {isLoading && <ChatListSkeleton />}
            {isError && (
              <p className="text-center text-sm text-red-400 mt-8">
                Couldn't load chats. Try again.
              </p>
            )}

            {!isLoading && !isError && (
              <>
                {visiblePinnedConversations.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 px-2 pb-2 pt-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        Pinned
                      </span>
                      <div className="h-px flex-1 bg-white/[0.08]" />
                    </div>
                    <div className="flex flex-col gap-0.5 mb-3">
                      {visiblePinnedConversations.map((c) => (
                        <div key={c.id} className="animate-fadeIn">
                          <ChatListItem
                            conversation={c}
                            currentUserId={userId}
                            isActive={activeConversationId === c.id}
                            isPinnedLocally={pinnedLocally.has(c.id)}
                            isForcedUnread={forcedUnreadLocally.has(c.id)}
                            onSelect={onSelectConversation}
                            onTogglePinLocally={handleTogglePinLocally}
                            onToggleUnreadLocally={toggleUnreadLocally}
                            onMarkReadLocally={(id) => markConversationsRead([id])}
                            onCreateFolder={() => {
                              setEditingFolder(null);
                              setFolderModalOpen(true);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-0.5">
                  {visibleUnpinnedConversations.map((c) => (
                    <div key={c.id} className="animate-fadeIn">
                      <ChatListItem
                        conversation={c}
                        currentUserId={userId}
                        isActive={activeConversationId === c.id}
                        isPinnedLocally={pinnedLocally.has(c.id)}
                        isForcedUnread={forcedUnreadLocally.has(c.id)}
                        onSelect={onSelectConversation}
                        onTogglePinLocally={handleTogglePinLocally}
                        onToggleUnreadLocally={toggleUnreadLocally}
                        onMarkReadLocally={(id) => markConversationsRead([id])}
                        onCreateFolder={() => {
                          setEditingFolder(null);
                          setFolderModalOpen(true);
                        }}
                      />
                    </div>
                  ))}
                  {filteredConversations.length === 0 && (
                    <p className="text-center text-sm text-gray-500 mt-8">No chats found</p>
                  )}
                  {hasMoreVisibleConversations && <ChatListMoreSkeleton />}
                </div>
              </>
            )}
          </div>

          <div
            onMouseDown={handleResizeStart}
            onMouseEnter={() => setIsHandleHovered(true)}
            onMouseLeave={() => setIsHandleHovered(false)}
            className="absolute top-0 right-0 h-full w-2 flex items-center justify-center z-10"
            style={{ cursor: 'e-resize' }}
          >
            <div
              className={`h-full w-px transition-colors duration-150 ${
                isHandleHovered || isResizing ? 'bg-gray-400' : 'bg-transparent'
              }`}
            />
          </div>
        </>
      )}

      {isNewGroupModalOpen && (
        <NewGroupModal
          onClose={() => setNewGroupModalOpen(false)}
          onCreated={(conversationId) => {
            setNewGroupModalOpen(false);
            onSelectConversation(conversationId);
          }}
        />
      )}

      {isArchiveModalOpen && <ArchivedChatsModal onClose={() => setArchiveModalOpen(false)} />}

      {contextMenu && (
        <ChatFolderContextMenu
          folder={contextMenu.folder}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEdit={() => handleEditFolder(contextMenu.folder)}
          onMarkRead={() => handleMarkFolderRead(contextMenu.folder)}
          onDelete={() => {
            setDeleteTarget(contextMenu.folder);
            setContextMenu(null);
          }}
        />
      )}

      {isFolderModalOpen && (
        <ChatFolderModal
          folder={editingFolder}
          conversations={effectiveConversations}
          currentUserId={userId}
          onClose={() => {
            setFolderModalOpen(false);
            setEditingFolder(null);
          }}
          onSave={handleSaveFolder}
        />
      )}

      {deleteTarget && (
        <DeleteChatFolderModal
          folderName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteFolder(deleteTarget.id);
            if (activeFolderId === deleteTarget.id) setActiveFolderId('all');
            setDeleteTarget(null);
          }}
        />
      )}

      {isRestrictedOpen && <RestrictedAccountsPanel onClose={() => setRestrictedOpen(false)} />}
    </div>
  );
}
