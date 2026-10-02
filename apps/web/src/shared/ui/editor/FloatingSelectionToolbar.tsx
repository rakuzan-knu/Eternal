import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  EyeOff,
  Quote,
  Code,
  Link as LinkIcon,
  Check,
  X,
} from 'lucide-react';

export type SelectionFormatType =
  'bold' | 'italic' | 'underline' | 'strike' | 'spoiler' | 'quote' | 'code' | 'link';

export interface FloatingSelectionToolbarProps {
  position: { top: number; left: number };
  onFormat: (type: SelectionFormatType, linkUrl?: string) => void;
  onClose: () => void;
}

export function FloatingSelectionToolbar({
  position,
  onFormat,
  onClose: _onClose,
}: FloatingSelectionToolbarProps) {
  const [isLinkInputOpen, setIsLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isLinkInputOpen && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [isLinkInputOpen]);

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (linkUrl.trim()) {
      onFormat('link', linkUrl.trim());
      setIsLinkInputOpen(false);
      setLinkUrl('');
    }
  };

  if (typeof document === 'undefined' || !document.body) return null;

  const clampedLeft =
    typeof window !== 'undefined'
      ? Math.max(160, Math.min(window.innerWidth - 160, position.left))
      : position.left;

  return createPortal(
    <div
      style={{
        top: `${Math.max(10, position.top)}px`,
        left: `${clampedLeft}px`,
      }}
      className="fixed -translate-x-1/2 -translate-y-full -mt-2.5 z-[99999] animate-popIn flex items-center bg-[#1c1d24]/95 border border-white/15 backdrop-blur-2xl px-1.5 py-1 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.7)] text-white pointer-events-auto select-none"
      onMouseDown={(e) => {
        // Prevent selection loss when clicking toolbar
        e.preventDefault();
      }}
    >
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#1c1d24] border-r border-b border-white/15 pointer-events-none" />
      {!isLinkInputOpen ? (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onFormat('bold')}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white transition-colors text-gray-700 dark:text-gray-300"
            title="Bold (**text**)"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => onFormat('italic')}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white transition-colors text-gray-700 dark:text-gray-300"
            title="Italic (*text*)"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => onFormat('underline')}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white transition-colors text-gray-700 dark:text-gray-300"
            title="Underline (__text__)"
          >
            <Underline size={15} />
          </button>
          <button
            type="button"
            onClick={() => onFormat('strike')}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 hover:text-gray-950 dark:hover:text-white transition-colors text-gray-700 dark:text-gray-300"
            title="Strikethrough (~~text~~)"
          >
            <Strikethrough size={15} />
          </button>
          <div className="w-[1px] h-4 bg-black/10 dark:bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => onFormat('spoiler')}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 hover:text-purple-600 dark:hover:text-purple-300 transition-colors text-gray-700 dark:text-gray-300"
            title="Spoiler (||text||)"
          >
            <EyeOff size={15} />
          </button>
          <button
            type="button"
            onClick={() => onFormat('code')}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 hover:text-amber-600 dark:hover:text-amber-300 transition-colors font-mono text-gray-700 dark:text-gray-300"
            title="Inline Code (`text`)"
          >
            <Code size={15} />
          </button>
          <button
            type="button"
            onClick={() => onFormat('quote')}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 hover:text-sky-600 dark:hover:text-sky-300 transition-colors text-gray-700 dark:text-gray-300"
            title="Blockquote (> text)"
          >
            <Quote size={15} />
          </button>
          <div className="w-[1px] h-4 bg-black/10 dark:bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => setIsLinkInputOpen(true)}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors text-gray-700 dark:text-gray-300"
            title="Add Link ([text](url))"
          >
            <LinkIcon size={15} />
          </button>
        </div>
      ) : (
        <form onSubmit={handleLinkSubmit} className="flex items-center gap-1.5 px-1 py-0.5">
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/15 rounded-xl px-2.5 py-1 text-xs text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-44"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsLinkInputOpen(false);
                setLinkUrl('');
              }
            }}
          />
          <button
            type="submit"
            className="p-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors cursor-pointer"
            title="Apply"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLinkInputOpen(false);
              setLinkUrl('');
            }}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </form>
      )}

      {/* Downward triangle arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-white/90 dark:border-t-[#181926]/95" />
    </div>,
    document.body,
  );
}

export default FloatingSelectionToolbar;
