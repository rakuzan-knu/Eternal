import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowLeft,
  Search,
  UserPlus,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
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
const NewGroupModal = lazy(() => import('./NewGroupModal'));
const ChatFolderModal = lazy(() => import('./ChatFolderModal'));
import ChatFolderRail from './ChatFolderRail';
import ChatFolderContextMenu from './ChatFolderContextMenu';
const DeleteChatFolderModal = lazy(() => import('./DeleteChatFolderModal'));
const ArchivedChatsModal = lazy(() => import('./ArchivedChatsModal'));
const RestrictedAccountsPanel = lazy(() => import('./RestrictedAccountsPanel'));
import { initializeAndPublishPrekeys } from '../lib/e2ee/x3dhRatchet';
import { ChatListSkeleton } from './ChatListSkeletons';
import { conversationFolderQuery } from '../lib/conversationPageFilters';

const MIN_WIDTH = 280;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 360;
const COLLAPSED_WIDTH = 64;

function getConversationActivityTime(conversation: ConversationView) {
  const activityAt =
    conversation.lastMessage?.createdAt ?? conversation.updatedAt ?? conversation.createdAt;
  const time = new Date(activityAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

interface ChatListPanelProps {
  onBack?: () => void;
  className?: string;
  onSelectConversation: (conversationId: string) => void;
  activeConversationId: string | null;
}

export default function ChatListPanel({
  onBack,
  className = '',
  onSelectConversation,
  activeConversationId,
}: ChatListPanelProps) {
  // Atomic selectors: list must not rerender on unrelated UI store writes.
  const isChatListExpanded = useUIStore((s) => s.isChatListExpanded);
  const toggleChatList = useUIStore((s) => s.toggleChatList);
  const openEditProfile = useUIStore((s) => s.openEditProfile);
  const userId = useAuthStore((s) => s.userId);
  // Folder mirror slices: subscribe per-field to avoid full-store rerenders.
  const systemFolders = useChatFoldersStore((s) => s.systemFolders);
  const folders = useChatFoldersStore((s) => s.folders);
  const folderOrders = useChatFoldersStore((s) => s.folderOrders);
  const addFolder = useChatFoldersStore((s) => s.addFolder);
  const updateFolder = useChatFoldersStore((s) => s.updateFolder);
  const deleteFolder = useChatFoldersStore((s) => s.deleteFolder);
  const reorderFolders = useChatFoldersStore((s) => s.reorderFolders);
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
  const [activeFolderId, setActiveFolderId] = useState('all');
  const activeFolder = useMemo(
    () =>
      allFolders.find(
        (folder) =>
          folder.id === activeFolderId ||
          (activeFolderId === 'all' && (folder.id === 'all' || folder.filterType === 'ALL')),
      ) ?? allFolders[0],
    [activeFolderId, allFolders],
  );
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

  useEffect(() => {
    if (userId) {
      void useChatFoldersStore.getState().syncWithServer();
      void initializeAndPublishPrekeys(userId).catch(() => {});
    }
  }, [userId]);

  const {
    pinnedLocally,
    forcedUnreadLocally,
    locallyReadConversations,
    togglePinLocally,
    toggleUnreadLocally,
    markConversationsRead,
  } = useLocalConversationOverrides();
  const {
    data: conversations,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useConversations({
    ...conversationFolderQuery(activeFolder),
    forcedUnreadIds: [...forcedUnreadLocally].sort(),
    locallyReadIds: [...locallyReadConversations].sort(),
  });

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

  const drafts = useChatDraftsStore((s) => s.drafts);

  const filteredConversations = useMemo(() => {
    if (!activeFolder) return [];
    return getFolderConversations(activeFolder, effectiveConversations, forcedUnreadLocally).sort(
      (a, b) => {
        const hasDraftA = Boolean(drafts[a.id]?.text?.trim());
        const hasDraftB = Boolean(drafts[b.id]?.text?.trim());
        if (hasDraftA !== hasDraftB) {
          return hasDraftA ? -1 : 1;
        }
        return 0; // Keep the server snapshot positions across realtime updates.
      },
    );
  }, [activeFolder, drafts, effectiveConversations, forcedUnreadLocally]);

  const orderedConversations = useMemo(
    () => [
      ...filteredConversations.filter((c) => pinnedLocally.has(c.id)),
      ...filteredConversations.filter((c) => !pinnedLocally.has(c.id)),
    ],
    [filteredConversations, pinnedLocally],
  );
  const rows = useMemo(() => {
    const pinned = orderedConversations.filter((c) => pinnedLocally.has(c.id));
    const unpinned = orderedConversations.filter((c) => !pinnedLocally.has(c.id));
    return [
      ...(pinned.length
        ? [
            { key: 'pinned-heading', conversation: null },
            ...pinned.map((conversation) => ({ key: conversation.id, conversation })),
          ]
        : []),
      ...unpinned.map((conversation) => ({ key: conversation.id, conversation })),
    ];
  }, [orderedConversations, pinnedLocally]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => (rows[index].conversation ? 88 : 32),
    getItemKey: (index) => rows[index].key,
    overscan: 5,
    enabled: isChatListExpanded,
  });
  const virtualItems = virtualizer.getVirtualItems();
  useEffect(() => {
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      virtualItems.some((item) => item.index >= rows.length - 5)
    )
      void fetchNextPage();
  }, [virtualItems, rows.length, hasNextPage, isFetchingNextPage, fetchNextPage]);
  const visibleDirectUserIds = virtualItems.flatMap((item) => {
    const conversation = rows[item.index].conversation;
    const id =
      conversation?.type === 'DIRECT'
        ? getConversationDisplay(conversation, userId).otherUserId
        : null;
    return id ? [id] : [];
  });
  useQueryOnlineStatus(visibleDirectUserIds);
  const lastScrolledSelection = useRef<string | null>(null);
  useEffect(() => {
    if (!isChatListExpanded) {
      lastScrolledSelection.current = null;
      return;
    }
    if (activeConversationId && isChatListExpanded) {
      const selection = `${activeFolderId}:${activeConversationId}`;
      if (lastScrolledSelection.current === selection) return;
      const index = rows.findIndex((row) => row.conversation?.id === activeConversationId);
      if (index >= 0) {
        virtualizer.scrollToIndex(index, { align: 'auto' });
        lastScrolledSelection.current = selection;
      }
    }
  }, [activeConversationId, activeFolderId, isChatListExpanded, rows, virtualizer]);

  // Keyboard Shortcut: Alt+ArrowDown / Alt+ArrowUp to switch chats smoothly
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;

      // Skip if any modal / dialog / full-screen overlay is open
      if (document.querySelector('[role="dialog"], [aria-modal="true"], .glass-modal')) return;

      const ordered = orderedConversations;
      if (ordered.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();

        if (!activeConversationId) {
          // When no chat is open yet, Alt+ArrowDown opens the very first chat
          onSelectConversation(ordered[0].id);
        } else {
          const currentIndex = ordered.findIndex((c) => c.id === activeConversationId);
          if (currentIndex === -1) {
            onSelectConversation(ordered[0].id);
          } else {
            if (currentIndex === ordered.length - 1 && hasNextPage) {
              if (isFetchingNextPage) return;
              const next = await fetchNextPage();
              const nextConversation = next.data?.pages
                .flatMap((page) => page.data)
                .find((c) => !ordered.some((loaded) => loaded.id === c.id));
              if (nextConversation) onSelectConversation(nextConversation.id);
              return;
            }
            const nextIndex = Math.min(ordered.length - 1, currentIndex + 1);
            onSelectConversation(ordered[nextIndex].id);
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();

        // Only switch if already in a chat
        if (activeConversationId) {
          const currentIndex = ordered.findIndex((c) => c.id === activeConversationId);
          if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            onSelectConversation(ordered[prevIndex].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    orderedConversations,
    activeConversationId,
    onSelectConversation,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

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
  };

  const handleCreateFolder = () => {
    setEditingFolder(null);
    setFolderModalOpen(true);
  };

  React.useEffect(() => {
    const handler = () => {
      setEditingFolder(null);
      setFolderModalOpen(true);
    };
    window.addEventListener('open-create-folder', handler);
    return () => window.removeEventListener('open-create-folder', handler);
  }, []);

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
      className={`relative h-full shrink-0 flex flex-col glass-sidebar border-r border-white/10 py-6 transition-[width] ease-in-out overflow-hidden ${className}`}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="md:hidden min-h-11 shrink-0 px-4 mb-3 flex items-center gap-2 text-sm text-gray-300"
        >
          <ArrowLeft size={18} aria-hidden="true" /> Back to feed
        </button>
      )}
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
            <div
              onClick={() => useUIStore.getState().openGlobalSearch()}
              className="relative cursor-pointer group"
            >
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-gray-300 transition-colors pointer-events-none"
              />
              <div className="w-full h-10 pl-10 pr-14 flex items-center rounded-full bg-white/5 border border-white/5 text-sm text-gray-400 group-hover:bg-white/10 group-hover:border-white/10 transition-all select-none">
                <span className="truncate">Search in Messenger</span>
              </div>
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 bg-white/5 border border-white/10 rounded pointer-events-none">
                Ctrl K
              </kbd>
            </div>
          </div>

          <ChatFolderRail
            folders={allFolders}
            conversations={effectiveConversations}
            activeFolderId={activeFolder?.id ?? 'all'}
            forcedUnreadIds={forcedUnreadLocally}
            countsComplete={
              !hasNextPage &&
              conversationFolderQuery(activeFolder).filter === 'ALL' &&
              !activeFolder?.excludeIds.length
            }
            onSelect={setActiveFolderId}
            onCreate={handleCreateFolder}
            onContextMenu={(folder, x, y) => setContextMenu({ folder, x, y })}
            onReorder={(orderedIds) => reorderFolders(folderOrderOwnerId, orderedIds)}
          />

          <div
            ref={scrollRef}
            onScroll={(event) => {
              const el = event.currentTarget;
              if (
                hasNextPage &&
                !isFetchingNextPage &&
                el.scrollHeight - el.scrollTop - el.clientHeight < 300
              )
                void fetchNextPage();
            }}
            className="flex-1 min-h-0 overflow-y-auto px-3"
            role="list"
            aria-label="Conversations"
          >
            {isLoading && <ChatListSkeleton />}
            {isError && (
              <p className="text-center text-sm text-red-400 mt-8">
                Couldn't load chats. <button onClick={() => void refetch()}>Try again</button>.
              </p>
            )}

            {!isLoading && !isError && (
              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualItems.map((item) => {
                  const conversation = rows[item.index].conversation;
                  return (
                    <div
                      key={item.key}
                      data-index={item.index}
                      role={conversation ? 'listitem' : 'presentation'}
                      ref={virtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${item.start}px)`,
                      }}
                    >
                      {conversation ? (
                        <ChatListItem
                          conversation={conversation}
                          currentUserId={userId}
                          isActive={activeConversationId === conversation.id}
                          isPinnedLocally={pinnedLocally.has(conversation.id)}
                          isForcedUnread={forcedUnreadLocally.has(conversation.id)}
                          onSelect={onSelectConversation}
                          onTogglePinLocally={handleTogglePinLocally}
                          onToggleUnreadLocally={toggleUnreadLocally}
                          onMarkReadLocally={(id) => markConversationsRead([id])}
                          onCreateFolder={() => {
                            setEditingFolder(null);
                            setFolderModalOpen(true);
                          }}
                        />
                      ) : (
                        <div className="flex items-center gap-3 px-2 pb-2 pt-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                            Pinned
                          </span>
                          <div className="h-px flex-1 bg-white/8" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredConversations.length === 0 && (
                  <p className="text-center text-sm text-gray-500 mt-8">No chats found</p>
                )}
              </div>
            )}
            {hasNextPage && (
              <button
                type="button"
                className="w-full py-3 text-sm text-gray-400"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? 'Loading chats...' : 'Load more chats'}
              </button>
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

      <Suspense fallback={null}>
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
      </Suspense>
    </div>
  );
}
