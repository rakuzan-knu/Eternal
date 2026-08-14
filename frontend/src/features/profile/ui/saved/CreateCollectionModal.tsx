import React, { useState } from 'react';
import { X, FolderPlus, Check } from 'lucide-react';
import { PostType } from '@/entities/post/model/types';
import Avatar from '@/shared/ui/Avatar';

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedPosts: PostType[];
  onCreate: (name: string, selectedPostIds: string[]) => void;
}

export function CreateCollectionModal({
  isOpen,
  onClose,
  savedPosts,
  onCreate,
}: CreateCollectionModalProps) {
  const [name, setName] = useState('');
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleSelectPost = (postId: string | number) => {
    const idStr = String(postId);
    setSelectedPostIds((prev) =>
      prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), selectedPostIds);
    setName('');
    setSelectedPostIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-[#121216]/95 border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col z-10 animate-modalIn max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <FolderPlus size={20} className="text-white" />
            <h3 className="font-semibold text-white text-base">New collection</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Collection name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Design inspiration, Favorites, Memes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          {savedPosts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Add saved posts ({selectedPostIds.length} selected)
                </label>
                {selectedPostIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedPostIds([])}
                    className="text-[11px] text-gray-400 hover:text-white"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                {savedPosts.map((post) => {
                  const isSelected = selectedPostIds.includes(String(post.id));
                  const firstImg = post.media?.find((m) => m.type === 'image')?.url || post.image;

                  return (
                    <div
                      key={post.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSelectPost(post.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSelectPost(post.id);
                        }
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border cursor-pointer group transition-all ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/50'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                    >
                      {firstImg ? (
                        <img
                          src={firstImg}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/[0.04] p-2 flex flex-col justify-between text-left">
                          <div className="flex items-center gap-1">
                            <Avatar size="sm" src={post.avatar} />
                          </div>
                          <p className="text-[10px] text-gray-300 line-clamp-3 leading-tight">
                            {post.text || 'Post'}
                          </p>
                        </div>
                      )}

                      {/* Selection Checkmark */}
                      <div
                        className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-blue-500 text-white'
                            : 'bg-black/50 text-transparent group-hover:text-white/40 border border-white/20'
                        }`}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.08] mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-white text-black hover:bg-gray-200 disabled:opacity-40 transition-all shadow-lg cursor-pointer"
            >
              Create collection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
