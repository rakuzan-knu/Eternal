import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, List, AlignJustify } from 'lucide-react';

import { SORT_LABELS, type SortKey, type ViewMode } from '../model/types';

export type { SortKey, ViewMode };

interface PlaylistSortViewMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRect: DOMRect | null;
  triggerRef?: React.RefObject<HTMLElement | null>;
  sortKey: SortKey;
  onSelectSortKey: (key: SortKey) => void;
  viewMode: ViewMode;
  onSelectViewMode: (mode: ViewMode) => void;
}

export const PlaylistSortViewMenu: React.FC<PlaylistSortViewMenuProps> = ({
  isOpen,
  onClose,
  anchorRect,
  triggerRef,
  sortKey,
  onSelectSortKey,
  viewMode,
  onSelectViewMode,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      // If click was on trigger button, let trigger handle toggling
      if (triggerRef?.current && triggerRef.current.contains(e.target as Node)) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !anchorRect) return null;

  const menuWidth = 240;
  const menuHeight = 350;
  let top = anchorRect.bottom + 6;
  if (top + menuHeight > window.innerHeight - 16) {
    top = Math.max(16, anchorRect.top - menuHeight - 6);
  }

  let left = anchorRect.right - menuWidth;
  if (left < 16) {
    left = 16;
  }

  const sortOptions: SortKey[] = [
    'default',
    'title',
    'artist',
    'album',
    'dateAdded',
    'releaseDate',
    'duration',
  ];

  return createPortal(
    <div
      ref={menuRef}
      data-menu-portal="true"
      style={{ top, left, width: menuWidth }}
      className="fixed z-[9999] rounded-2xl glass-modal backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-2xl p-1.5 text-gray-900 dark:text-white select-none animate-fadeIn flex flex-col gap-0.5"
    >
      {/* Header: Sort by */}
      <div className="px-3 py-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Sort by
      </div>

      {sortOptions.map((key) => {
        const isSelected = sortKey === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              onSelectSortKey(key);
              onClose();
            }}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
              isSelected
                ? 'text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/15'
                : 'text-gray-700 hover:text-gray-950 hover:bg-black/5 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5'
            }`}
          >
            <span>{SORT_LABELS[key]}</span>
            {isSelected && (
              <Check size={15} strokeWidth={2.5} className="text-purple-600 dark:text-purple-400" />
            )}
          </button>
        );
      })}

      <div className="my-1 border-t border-black/10 dark:border-white/10" />

      {/* Header: View as */}
      <div className="px-3 py-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        View as
      </div>

      {/* Compact */}
      <button
        type="button"
        onClick={() => {
          onSelectViewMode('compact');
          onClose();
        }}
        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
          viewMode === 'compact'
            ? 'text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/15'
            : 'text-gray-700 hover:text-gray-950 hover:bg-black/5 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <AlignJustify
            size={15}
            className={
              viewMode === 'compact'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400'
            }
          />
          <span>Compact</span>
        </div>
        {viewMode === 'compact' && (
          <Check size={15} strokeWidth={2.5} className="text-purple-600 dark:text-purple-400" />
        )}
      </button>

      {/* List */}
      <button
        type="button"
        onClick={() => {
          onSelectViewMode('list');
          onClose();
        }}
        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
          viewMode === 'list'
            ? 'text-purple-600 dark:text-purple-400 font-semibold bg-purple-500/15'
            : 'text-gray-700 hover:text-gray-950 hover:bg-black/5 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <List
            size={15}
            className={
              viewMode === 'list'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400'
            }
          />
          <span>List</span>
        </div>
        {viewMode === 'list' && (
          <Check size={15} strokeWidth={2.5} className="text-purple-600 dark:text-purple-400" />
        )}
      </button>
    </div>,
    document.body,
  );
};
