import React, { useState, useRef, useEffect } from 'react';
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

  return (
    <div
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="fixed -translate-x-1/2 -translate-y-full mb-3 z-50 animate-popIn flex items-center bg-[#181926]/95 border border-white/10 backdrop-blur-2xl px-1.5 py-1 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] text-gray-300 pointer-events-auto"
      onMouseDown={(e) => {
        // Prevent selection loss when clicking toolbar
        e.preventDefault();
      }}
    >
      {!isLinkInputOpen ? (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onFormat('bold')}
            className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
            title="Bold (**text**)"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => onFormat('italic')}
            className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
            title="Italic (*text*)"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => onFormat('underline')}
            className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
            title="Underline (__text__)"
          >
            <Underline size={15} />
          </button>
          <button
            type="button"
            onClick={() => onFormat('strike')}
            className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
            title="Strikethrough (~~text~~)"
          >
            <Strikethrough size={15} />
          </button>
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => onFormat('spoiler')}
            className="p-1.5 rounded-xl hover:bg-white/10 hover:text-purple-300 transition-colors"
            title="Spoiler (||text||)"
          >
            <EyeOff size={15} />
          </button>
          <button
            type="button"
            onClick={() => onFormat('code')}
            className="p-1.5 rounded-xl hover:bg-white/10 hover:text-amber-300 transition-colors font-mono"
            title="Inline Code (`text`)"
          >
            <Code size={15} />
          </button>
          <button
            type="button"
            onClick={() => onFormat('quote')}
            className="p-1.5 rounded-xl hover:bg-white/10 hover:text-sky-300 transition-colors"
            title="Blockquote (> text)"
          >
            <Quote size={15} />
          </button>
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <button
            type="button"
            onClick={() => setIsLinkInputOpen(true)}
            className="p-1.5 rounded-xl hover:bg-white/10 hover:text-emerald-300 transition-colors"
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
            className="bg-black/40 border border-white/15 rounded-xl px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-44"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsLinkInputOpen(false);
                setLinkUrl('');
              }
            }}
          />
          <button
            type="submit"
            className="p-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors"
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
            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </form>
      )}

      {/* Downward triangle arrow */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-[#181926]/95" />
    </div>
  );
}

export default FloatingSelectionToolbar;
