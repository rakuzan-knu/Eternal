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

interface FloatingSelectionToolbarProps {
  position: { top: number; left: number };
  onFormat: (type: SelectionFormatType, linkUrl?: string) => void;
  onClose: () => void;
  usePortal?: boolean;
}

export default function FloatingSelectionToolbar({
  position,
  onFormat,
  onClose: _onClose,
  usePortal = false,
}: FloatingSelectionToolbarProps) {
  const [isLinkInputOpen, setIsLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLinkInputOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLinkInputOpen]);

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkUrl.trim()) {
      onFormat('link', linkUrl.trim());
      setLinkUrl('');
      setIsLinkInputOpen(false);
    }
  };

  const clampedLeft =
    typeof window !== 'undefined'
      ? Math.max(160, Math.min(window.innerWidth - 160, position.left))
      : position.left;

  const content = (
    <div
      style={{
        top: `${Math.max(10, position.top)}px`,
        left: `${clampedLeft}px`,
      }}
      className="fixed z-[99999] -translate-x-1/2 -translate-y-full -mt-2.5 rounded-2xl bg-[#1c1d24]/95 border border-white/15 px-2 py-1 shadow-[0_12px_36px_rgba(0,0,0,0.7)] backdrop-blur-2xl flex items-center gap-0.5 animate-scaleIn text-white select-none transition-all duration-150 pointer-events-auto"
      onMouseDown={(e) => {
        // Prevent losing textarea focus/selection on toolbar click
        e.preventDefault();
      }}
    >
      {/* Downward pointing arrow pointing directly to the selection */}
      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#1c1d24] border-r border-b border-white/15 pointer-events-none" />
      {isLinkInputOpen ? (
        <form onSubmit={handleLinkSubmit} className="flex items-center gap-1 px-1 py-0.5">
          <input
            ref={inputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="bg-black/5 dark:bg-white/10 text-xs text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 px-2.5 py-1 rounded-full border border-black/10 dark:border-white/15 focus:outline-none focus:border-purple-400 w-44"
          />
          <button
            type="submit"
            className="w-6 h-6 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Apply link"
          >
            <Check size={12} className="stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => setIsLinkInputOpen(false)}
            className="w-6 h-6 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
            title="Cancel"
          >
            <X size={12} />
          </button>
        </form>
      ) : (
        <>
          {/* Bold */}
          <button
            type="button"
            onClick={() => onFormat('bold')}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Bold (**text**)"
          >
            <Bold size={13} className="stroke-[2.5]" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => onFormat('italic')}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Italic (*text*)"
          >
            <Italic size={13} />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => onFormat('underline')}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Underline (__text__)"
          >
            <Underline size={13} />
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            onClick={() => onFormat('strike')}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Strikethrough (~~text~~)"
          >
            <Strikethrough size={13} />
          </button>

          {/* Spoiler */}
          <button
            type="button"
            onClick={() => onFormat('spoiler')}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 transition-colors cursor-pointer active:scale-95"
            title="Spoiler (||secret||)"
          >
            <EyeOff size={13} />
          </button>

          {/* Quote */}
          <button
            type="button"
            onClick={() => onFormat('quote')}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Quote (> text)"
          >
            <Quote size={13} />
          </button>

          {/* Inline Code */}
          <button
            type="button"
            onClick={() => onFormat('code')}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 transition-colors cursor-pointer active:scale-95 font-mono text-[11px]"
            title="Inline code (`code`)"
          >
            <Code size={13} />
          </button>

          {/* Link */}
          <button
            type="button"
            onClick={() => setIsLinkInputOpen(true)}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 hover:text-sky-600 dark:hover:text-sky-300 transition-colors cursor-pointer active:scale-95"
            title="Insert Link"
          >
            <LinkIcon size={13} />
          </button>
        </>
      )}
    </div>
  );

  if (usePortal && typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }

  return content;
}
