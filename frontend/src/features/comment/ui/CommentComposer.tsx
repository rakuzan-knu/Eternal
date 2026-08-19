import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { AddEmojiButton } from '../../../shared/ui/AddEmojiButton';
import { MentionAutocomplete } from '../../posts/ui/MentionAutocomplete';
import { commentsApi } from '../api/commentsApi';

const MAX_COMMENT_LENGTH = 1000;
const MAX_TEXTAREA_HEIGHT = 115; // Allows ~4 to 4.5 lines of text comfortably

interface CommentComposerProps {
  currentUserHandle: string;
  replyingTo: { commentId: string; username: string; displayName?: string } | null;
  onCancelReply: () => void;
  onSubmit: (
    text: string,
    mediaUrl?: string,
    parentId?: string,
    clientMutationId?: string,
  ) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function CommentComposer({
  currentUserHandle,
  replyingTo,
  onCancelReply,
  onSubmit,
  isSubmitting = false,
}: CommentComposerProps) {
  const [text, setText] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea height smoothly up to 4 - 4.5 lines
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      const targetHeight = Math.max(38, Math.min(scrollH, MAX_TEXTAREA_HEIGHT));
      textareaRef.current.style.height = `${targetHeight}px`;
    }
  }, [text]);

  // Focus textarea when replyingTo changes
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
      // If text doesn't have @username mention yet, auto-prefix it
      const mention = `@${replyingTo.username} `;
      if (!text.startsWith(mention)) {
        setText((prev) => mention + prev);
      }
    }
  }, [replyingTo]);

  // Handle Escape key to cancel reply
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && replyingTo) {
        onCancelReply();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [replyingTo, onCancelReply]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setCursorPos(e.target.selectionStart || 0);
  };

  const handleMentionSelect = (newText: string, newPos: number) => {
    setText(newText);
    setCursorPos(newPos);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        alert('Image exceeds 5MB limit');
        return;
      }
      setIsUploadingImage(true);
      try {
        const url = await commentsApi.uploadMedia(file);
        if (url) {
          setImagePreview(url);
          setIsUploadingImage(false);
          return;
        }
      } catch {
        // Fallback to local data URI
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (
      (!text.trim() && !imagePreview) ||
      text.length > MAX_COMMENT_LENGTH ||
      isSubmitting ||
      isUploadingImage
    ) {
      return;
    }

    const clientMutationId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `mut-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    await onSubmit(text.trim(), imagePreview || undefined, replyingTo?.commentId, clientMutationId);
    setText('');
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onCancelReply();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isOverLimit = text.length > MAX_COMMENT_LENGTH;
  const isNearLimit = text.length >= 850 && text.length <= MAX_COMMENT_LENGTH;
  const canSubmit =
    (text.trim().length > 0 || !!imagePreview) &&
    !isOverLimit &&
    !isSubmitting &&
    !isUploadingImage;

  return (
    <div className="sticky bottom-0 bg-[#0c0d16]/95 backdrop-blur-2xl border-t border-white/[0.08] p-3 sm:p-4 z-20 transition-all shrink-0">
      {/* Sliding Replying Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-purple-950/40 border border-purple-500/30 rounded-xl px-3 py-1.5 mb-2.5 text-xs text-purple-200 animate-fadeIn">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-gray-400">Replying to</span>
            <span className="font-semibold text-purple-300 truncate">@{replyingTo.username}</span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-purple-300 hover:text-white p-0.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Cancel reply (Esc)"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Inline Matte Media Preview with Delete Cross & Spinner */}
      {imagePreview && (
        <div className="relative inline-block mb-2.5 rounded-xl overflow-hidden border border-white/[0.12] bg-black/60 shadow-lg">
          <img src={imagePreview} alt="upload preview" className="w-20 h-20 object-cover" />
          {isUploadingImage ? (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-purple-400" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setImagePreview(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="absolute top-1 right-1 bg-black/80 hover:bg-red-600 text-white p-1 rounded-full transition-colors cursor-pointer"
              title="Remove image"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2.5 relative">
        <div className="flex-1 relative flex flex-col rounded-2xl bg-white/[0.04] border border-white/[0.08] focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/30 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onSelect={(e) => setCursorPos((e.target as HTMLTextAreaElement).selectionStart || 0)}
            onKeyDown={handleKeyDown}
            placeholder={
              replyingTo
                ? `Reply to @${replyingTo.username}...`
                : `Add a comment as @${currentUserHandle}...`
            }
            className="w-full bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none resize-none min-h-[38px] max-h-[115px] leading-relaxed overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
          />

          {/* Action Tools Inside Input Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/[0.04]">
            <div className="flex items-center gap-1.5">
              <AddEmojiButton
                isOpen={isEmojiOpen}
                onToggle={() => setIsEmojiOpen((prev) => !prev)}
                onEmojiSelect={(emoji) => {
                  setText((prev) => prev + emoji);
                  setIsEmojiOpen(false);
                  textareaRef.current?.focus();
                }}
                usePortal={true}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-white/[0.06] rounded-xl transition-colors cursor-pointer"
                title="Attach image"
              >
                <ImageIcon size={17} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Character Limit Counter */}
              <span
                className={`text-[10px] tabular-nums transition-colors ${
                  isOverLimit
                    ? 'text-red-400 font-bold'
                    : isNearLimit
                      ? 'text-amber-400 font-semibold'
                      : 'text-gray-500'
                }`}
              >
                {text.length} / {MAX_COMMENT_LENGTH}
              </span>

              <span className="hidden sm:inline text-[10px] text-gray-500 select-none">
                Ctrl+Enter
              </span>
            </div>
          </div>
        </div>

        {/* Mention Autocomplete */}
        <MentionAutocomplete text={text} cursorPos={cursorPos} onSelect={handleMentionSelect} />

        {/* Glowing Purple Post / Send Button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`h-[42px] px-4 rounded-2xl font-medium text-sm flex items-center justify-center transition-all duration-200 shrink-0 ${
            canSubmit
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.5)] cursor-pointer active:scale-95'
              : 'bg-white/[0.05] text-gray-500 cursor-not-allowed opacity-50'
          }`}
          title="Send comment"
        >
          {isSubmitting ? (
            <Loader2 size={17} className="animate-spin text-white" />
          ) : (
            <span className="flex items-center gap-1.5 font-semibold">
              <Send size={15} />
              <span className="hidden sm:inline">Post</span>
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
