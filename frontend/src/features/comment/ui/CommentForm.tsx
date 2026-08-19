import React, { useState, useRef } from 'react';
import { Send, Image, X } from 'lucide-react';
import { AddEmojiButton } from '../../../shared/ui/AddEmojiButton';
import { MentionAutocomplete } from '../../posts/ui/MentionAutocomplete';

interface CommentFormProps {
  currentUserHandle: string;
  onSubmitComment?: (text: string, images?: string[]) => void;
  isSubmitting?: boolean;
}

export function CommentForm({
  currentUserHandle,
  onSubmitComment,
  isSubmitting = false,
}: CommentFormProps) {
  const [text, setText] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setCursorPos(e.target.selectionStart || 0);
  };

  const handleCursorMove = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCursorPos(target.selectionStart || 0);
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

  const handleCommentSubmit = () => {
    if (!text.trim() && images.length === 0) return;

    if (onSubmitComment) {
      onSubmitComment(text.trim(), images);
    }

    setText('');
    setImages([]);
    setIsEmojiOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCommentSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommentSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).map((file) => URL.createObjectURL(file));
      setImages((prev) => [...prev, ...filesArray]);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 mt-2 w-full relative"
    >
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-white/[0.01] border border-white/[0.04] rounded-2xl">
          {images.map((url, idx) => (
            <div
              key={idx}
              className="relative group w-16 h-16 rounded-xl overflow-hidden border border-white/[0.1]"
            >
              <img src={url} className="w-full h-full object-cover" alt="preview" />
              <button
                type="button"
                onClick={() => setImages(images.filter((_, i) => i !== idx))}
                className="absolute top-1 right-1 bg-black/75 p-0.5 rounded-full text-white transition-all cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <MentionAutocomplete text={text} cursorPos={cursorPos} onSelect={handleMentionSelect} />

      <div className="flex gap-3 items-end">
        <div className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-2 flex items-end gap-2 focus-within:border-white/[0.2] transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={`Comment as ${currentUserHandle}...`}
            value={text}
            onChange={handleTextChange}
            onKeyUp={handleCursorMove}
            onClick={handleCursorMove}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none resize-none max-h-24 py-1 custom-scrollbar min-h-[24px]"
          />
          <div className="flex items-center gap-2 text-gray-400 pb-0.5">
            <AddEmojiButton
              isOpen={isEmojiOpen}
              onToggle={() => setIsEmojiOpen(!isEmojiOpen)}
              onEmojiSelect={(emoji) => {
                setText((prev) => prev + emoji);
                setCursorPos((prev) => prev + emoji.length);
              }}
              usePortal={true}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-white transition-colors cursor-pointer"
            >
              <Image size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={(!text.trim() && images.length === 0) || isSubmitting}
          className="text-blue-500 hover:text-blue-400 disabled:opacity-20 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] p-3 mb-1 rounded-xl transition-all cursor-pointer flex items-center justify-center h-[50px] w-[50px]"
        >
          <Send size={20} />
        </button>
      </div>
    </form>
  );
}
