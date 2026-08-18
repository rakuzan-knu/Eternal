import React, { useState, useEffect } from 'react';
import { PostType } from '@/entities/post/model/types';
import Avatar from '@/shared/ui/Avatar';
import { Smile } from 'lucide-react';
import { PostMedia } from '@/entities/post/ui/PostMedia';

interface EditPostModalProps {
  post: PostType;
  isOpen: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (newContent: string) => void;
}

const MAX_CHARS = 1000;

export function EditPostModal({
  post,
  isOpen,
  isSaving = false,
  onClose,
  onSave,
}: EditPostModalProps) {
  const [content, setContent] = useState(post.text || '');

  useEffect(() => {
    if (isOpen) {
      setContent(post.text || '');
    }
  }, [isOpen, post.text]);

  if (!isOpen) return null;

  const media =
    post.media && post.media.length > 0
      ? post.media
      : post.image
        ? [{ type: 'image' as const, url: post.image }]
        : [];
  const charCount = content.length;

  const handleSave = () => {
    if (isSaving) return;
    onSave(content.slice(0, MAX_CHARS));
  };

  const handleInsertEmoji = (emoji: string) => {
    if (content.length + emoji.length <= MAX_CHARS) {
      setContent((prev) => prev + emoji);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-[#1c1c20] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <h3 className="text-base font-bold text-white">Edit information</h3>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="text-sm font-bold text-sky-400 hover:text-sky-300 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Done'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Media preview column (if media present) */}
          {media.length > 0 && (
            <div className="md:w-1/2 bg-black/40 flex items-center justify-center p-4 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto custom-scrollbar">
              <div className="w-full max-h-[50vh] rounded-2xl overflow-hidden shadow-lg">
                <PostMedia media={media} />
              </div>
            </div>
          )}

          {/* Text editor column */}
          <div
            className={`flex-1 flex flex-col p-5 ${media.length > 0 ? 'md:w-1/2' : 'w-full'} overflow-y-auto custom-scrollbar`}
          >
            {/* User info */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={post.avatar} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {post.author || post.handle}
                </p>
                <p className="text-xs text-gray-500 truncate">@{post.handle}</p>
              </div>
            </div>

            {/* Text input area */}
            <div className="flex-1 flex flex-col min-h-[160px]">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Write a caption..."
                maxLength={MAX_CHARS}
                rows={6}
                className="w-full flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-sm focus:outline-none resize-none leading-relaxed"
                autoFocus
              />

              {/* Bottom footer inside editor */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-2">
                <div className="flex items-center gap-1.5 text-gray-400">
                  {['✨', '🔥', '❤️', '👏', '🚀'].map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleInsertEmoji(em)}
                      className="text-base p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleInsertEmoji('😊')}
                    className="p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Smile size={18} />
                  </button>
                </div>

                <span
                  className={`text-xs font-mono ${charCount >= MAX_CHARS ? 'text-rose-400 font-bold' : 'text-gray-500'}`}
                >
                  {charCount} / {MAX_CHARS}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditPostModal;
