import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ConversationView } from '../../../entities/chat/model/types';
import { getFolderUnreadCount } from '../lib/chatFolderUtils';
import { ChatFolder } from '../model/useChatFoldersStore';
import ChatFolderIcon from './ChatFolderIcon';
import CreateFolderButton from './CreateFolderButton';

interface ChatFolderRailProps {
  folders: ChatFolder[];
  conversations: ConversationView[];
  forcedUnreadIds: Set<string>;
  activeFolderId: string;
  onSelect: (folderId: string) => void;
  onCreate: () => void;
  onContextMenu: (folder: ChatFolder, x: number, y: number) => void;
  onReorder: (orderedIds: string[]) => void;
}

export default function ChatFolderRail({
  folders,
  conversations,
  forcedUnreadIds,
  activeFolderId,
  onSelect,
  onCreate,
  onContextMenu,
  onReorder,
}: ChatFolderRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const dragStateRef = useRef<{
    folderId: string;
    started: boolean;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    width: number;
    pointerType: string;
  } | null>(null);
  const suppressNextClickRef = useRef(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    x: number;
    y: number;
    name: string;
    color: string;
    icon?: string | null;
    emoji?: string | null;
    offsetX: number;
    offsetY: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const updateOverflow = () => setIsOverflowing(rail.scrollWidth > rail.clientWidth + 4);
    updateOverflow();

    const observer = new ResizeObserver(updateOverflow);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [folders]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    rail.scrollLeft += event.deltaY;
    event.preventDefault();
  };

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const startDrag = useCallback(
    (folder: ChatFolder, state: NonNullable<typeof dragStateRef.current>, x: number, y: number) => {
      dragStateRef.current = { ...state, started: true };
      setDraggingFolderId(folder.id);
      setDragOverFolderId(folder.id);
      setDragPreview({
        x,
        y,
        name: folder.name,
        color: folder.color,
        icon: folder.icon,
        emoji: folder.emoji,
        offsetX: state.offsetX,
        offsetY: state.offsetY,
        width: state.width,
      });
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    },
    [],
  );

  const endDrag = useCallback(() => {
    const draggingId = draggingFolderId;
    const overId = dragOverFolderId;
    clearLongPress();
    dragStateRef.current = null;

    if (draggingId && overId && draggingId !== overId) {
      const fromIndex = folders.findIndex((folder) => folder.id === draggingId);
      const toIndex = folders.findIndex((folder) => folder.id === overId);
      if (fromIndex >= 0 && toIndex >= 0) {
        const ordered = [...folders];
        const [moved] = ordered.splice(fromIndex, 1);
        ordered.splice(toIndex, 0, moved);
        onReorder(ordered.map((folder) => folder.id));
      }
    }

    if (draggingId) suppressNextClickRef.current = true;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    setDraggingFolderId(null);
    setDragOverFolderId(null);
    setDragPreview(null);
  }, [clearLongPress, dragOverFolderId, draggingFolderId, folders, onReorder]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, folder: ChatFolder) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    clearLongPress();
    const rect = event.currentTarget.getBoundingClientRect();
    const state = {
      folderId: folder.id,
      started: false,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      pointerType: event.pointerType,
    };
    dragStateRef.current = state;
    longPressTimer.current = window.setTimeout(() => {
      const currentState = dragStateRef.current;
      if (!currentState || currentState.folderId !== folder.id || currentState.started) return;
      startDrag(folder, currentState, event.clientX, event.clientY);
    }, 180);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState) return;

      const moved = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
      if (!dragState.started && dragState.pointerType === 'mouse' && moved > 6) {
        clearLongPress();
        const folder = folders.find((item) => item.id === dragState.folderId);
        if (!folder) return;
        startDrag(folder, dragState, event.clientX, event.clientY);
      } else if (!dragState.started && moved > 18) {
        clearLongPress();
        dragStateRef.current = null;
        return;
      }

      if (!dragState.started) return;
      event.preventDefault();
      const draggedFolder = folders.find((folder) => folder.id === dragState.folderId);
      if (draggedFolder) {
        setDragPreview({
          x: event.clientX,
          y: event.clientY,
          name: draggedFolder.name,
          color: draggedFolder.color,
          icon: draggedFolder.icon,
          emoji: draggedFolder.emoji,
          offsetX: dragState.offsetX,
          offsetY: dragState.offsetY,
          width: dragState.width,
        });
      }

      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('[data-folder-id]');
      const overId = target instanceof HTMLElement ? (target.dataset.folderId ?? null) : null;
      if (overId) setDragOverFolderId(overId);

      const rail = railRef.current;
      if (rail) {
        const rect = rail.getBoundingClientRect();
        if (event.clientX > rect.right - 32) rail.scrollLeft += 8;
        if (event.clientX < rect.left + 32) rail.scrollLeft -= 8;
      }
    };

    const handlePointerUp = () => endDrag();

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [clearLongPress, endDrag, folders, startDrag]);

  return (
    <div className="relative mb-4 flex items-center gap-2 pl-5 pr-5">
      <div
        ref={railRef}
        onWheel={handleWheel}
        className={`no-scrollbar flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scroll-smooth ${
          isOverflowing ? 'pr-12' : ''
        }`}
      >
        {folders.map((folder) => {
          const unreadCount = getFolderUnreadCount(folder, conversations, forcedUnreadIds);
          const isActive = activeFolderId === folder.id;
          const isDragging = draggingFolderId === folder.id;
          const isDropTarget =
            Boolean(draggingFolderId) &&
            dragOverFolderId === folder.id &&
            draggingFolderId !== folder.id;
          const labelColor = isActive ? '#050505' : folder.color;

          return (
            <button
              key={folder.id}
              data-folder-id={folder.id}
              type="button"
              onPointerDown={(event) => handlePointerDown(event, folder)}
              onClick={(event) => {
                if (draggingFolderId || suppressNextClickRef.current) {
                  event.preventDefault();
                  suppressNextClickRef.current = false;
                  return;
                }
                onSelect(folder.id);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                clearLongPress();
                const rect = event.currentTarget.getBoundingClientRect();
                const menuWidth = 184;
                const menuHeight = folder.isSystem ? 98 : 142;
                const x = Math.min(window.innerWidth - menuWidth - 8, Math.max(8, rect.left));
                const y = Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 6);
                onContextMenu(folder, x, y);
              }}
              className={`group relative flex h-9 max-w-[158px] flex-shrink-0 touch-none select-none items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-all duration-200 ease-out ${
                isActive
                  ? 'scale-[1.02] border-transparent'
                  : 'border-white/10 bg-white/[0.045] hover:bg-white/[0.08]'
              } ${
                isDragging
                  ? 'scale-95 border-white/20 bg-white/[0.025] shadow-inner'
                  : isDropTarget
                    ? 'scale-[1.04] border-white/25 bg-white/[0.1]'
                    : ''
              }`}
              style={{
                backgroundColor: isActive ? folder.color : undefined,
                boxShadow: isDropTarget
                  ? `0 0 0 1px ${folder.color}44, 0 10px 26px ${folder.color}24`
                  : isActive
                    ? `0 8px 24px ${folder.color}33`
                    : undefined,
                color: labelColor,
                opacity: isDragging ? 0.42 : 1,
              }}
            >
              {isDropTarget && (
                <span
                  className="absolute -left-1.5 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full shadow-[0_0_14px_rgba(255,255,255,0.45)]"
                  style={{ backgroundColor: folder.color }}
                />
              )}
              {(folder.icon || folder.emoji) && (
                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                  <ChatFolderIcon
                    iconKey={folder.icon}
                    emoji={folder.emoji}
                    color={labelColor}
                    size={15}
                  />
                </span>
              )}
              <span className="min-w-0 truncate">{folder.name}</span>
              {unreadCount > 0 && (
                <span
                  className="ml-0.5 flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none transition-colors duration-300"
                  style={{
                    backgroundColor: isActive ? 'rgba(0,0,0,0.16)' : folder.color,
                    color: isActive ? '#050505' : '#050505',
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}

        {!isOverflowing && <CreateFolderButton onCreate={onCreate} className="flex-shrink-0" />}
      </div>

      {isOverflowing && (
        <div className="pointer-events-none absolute right-5 top-0 flex h-9 items-center bg-gradient-to-l from-[#16161a] via-[#16161a]/95 to-transparent pl-8">
          <CreateFolderButton onCreate={onCreate} className="pointer-events-auto" />
        </div>
      )}

      {dragPreview && (
        <div
          className="pointer-events-none fixed z-[430] flex h-9 max-w-[180px] items-center gap-1.5 rounded-full border border-white/20 bg-[#1f1f23]/92 px-3 text-[13px] font-semibold text-white shadow-2xl backdrop-blur-2xl backdrop-saturate-150 animate-popIn"
          style={{
            left: dragPreview.x - dragPreview.offsetX,
            top: dragPreview.y - dragPreview.offsetY,
            width: Math.min(Math.max(dragPreview.width, 72), 180),
            boxShadow: `0 18px 38px rgba(0,0,0,0.42), 0 0 0 1px ${dragPreview.color}33, 0 0 28px ${dragPreview.color}28`,
          }}
        >
          {(dragPreview.icon || dragPreview.emoji) && (
            <span
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${dragPreview.color}22` }}
            >
              <ChatFolderIcon
                iconKey={dragPreview.icon ?? null}
                emoji={dragPreview.emoji ?? null}
                color={dragPreview.color}
                size={14}
              />
            </span>
          )}
          <span className="truncate">{dragPreview.name}</span>
        </div>
      )}
    </div>
  );
}
