import React, { useState, useRef } from 'react';
import { Bookmark, Check, Plus, Folder, X } from 'lucide-react';
import { useSavedCollectionsStore } from '@/entities/post/model/useSavedCollectionsStore';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useClickOutside } from '@/shared/lib/useClickOutside';

interface SaveToCollectionPopoverProps {
  postId: string | number;
  isOpen: boolean;
  onClose: () => void;
  onPostSaved?: () => void;
}

export function SaveToCollectionPopover({
  postId,
  isOpen,
  onClose,
  onPostSaved,
}: SaveToCollectionPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, onClose);

  const { data: currentUser } = useCurrentUser();
  const userId = currentUser?.id ?? '';

  const allCollections = useSavedCollectionsStore((s) => s.collections);
  const collections = React.useMemo(
    () => allCollections.filter((c) => c.userId === userId),
    [allCollections, userId],
  );
  const addPostToCollection = useSavedCollectionsStore((s) => s.addPostToCollection);
  const removePostFromCollection = useSavedCollectionsStore((s) => s.removePostFromCollection);
  const createCollection = useSavedCollectionsStore((s) => s.createCollection);

  const [isCreating, setIsCreating] = useState(false);
  const [newColName, setNewColName] = useState('');

  if (!isOpen || !userId) return null;

  const postIdStr = String(postId);

  const handleToggleCollection = (colId: string, isContained: boolean) => {
    if (isContained) {
      removePostFromCollection(colId, postIdStr);
    } else {
      addPostToCollection(colId, postIdStr);
      onPostSaved?.();
    }
  };

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const col = createCollection(userId, newColName.trim());
    addPostToCollection(col.id, postIdStr);
    onPostSaved?.();
    setNewColName('');
    setIsCreating(false);
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Save to collection"
      className="absolute bottom-full right-0 mb-2 w-64 glass-modal border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl text-gray-900 dark:text-white p-3 z-50 animate-menuIn origin-bottom-right flex flex-col gap-2.5 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/[0.08]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white">
          <Bookmark size={14} className="fill-current text-gray-900 dark:text-white" />
          <span>Save to collection</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Collection List */}
      <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-0.5 custom-scrollbar">
        {collections.length === 0 ? (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 py-1 text-center italic">
            No custom collections yet
          </p>
        ) : (
          collections.map((col) => {
            const isContained = col.postIds.includes(postIdStr);

            return (
              <button
                key={col.id}
                type="button"
                onClick={() => handleToggleCollection(col.id, isContained)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors text-left cursor-pointer ${
                  isContained
                    ? 'bg-blue-500/15 dark:bg-white/10 text-blue-600 dark:text-white font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-950 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <Folder
                    size={14}
                    className={
                      isContained
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }
                  />
                  <span className="truncate">{col.name}</span>
                </div>

                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
                    isContained
                      ? 'bg-blue-500 text-white'
                      : 'border border-black/20 dark:border-white/20 text-transparent'
                  }`}
                >
                  <Check size={11} strokeWidth={3} />
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Inline Create Section */}
      {isCreating ? (
        <form
          onSubmit={handleCreateNew}
          className="flex flex-col gap-2 pt-2 border-t border-black/10 dark:border-white/[0.08]"
        >
          <input
            type="text"
            autoFocus
            placeholder="Collection name"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/[0.05] border border-black/10 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-2 py-1 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white rounded hover:bg-black/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newColName.trim()}
              className="px-3 py-1 text-[11px] font-semibold bg-gray-900 text-white dark:bg-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-40 cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-t border-black/10 dark:border-white/[0.08] cursor-pointer"
        >
          <Plus size={14} />
          <span>New collection</span>
        </button>
      )}
    </div>
  );
}
