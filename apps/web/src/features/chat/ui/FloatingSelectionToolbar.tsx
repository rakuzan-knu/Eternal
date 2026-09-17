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

interface FloatingSelectionToolbarProps {
  position: { top: number; left: number };
  onFormat: (type: SelectionFormatType, linkUrl?: string) => void;
  onClose: () => void;
}

export default function FloatingSelectionToolbar({
  position,
  onFormat,
  onClose: _onClose,
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

  return (
    <div
      style={{
        top: `${Math.max(10, position.top)}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
      }}
      className="fixed z-50 rounded-full bg-[#161522]/95 backdrop-blur-2xl border border-white/15 px-2 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-center gap-0.5 animate-scaleIn text-white select-none transition-all duration-150"
      onMouseDown={(e) => {
        // Prevent losing textarea focus/selection on toolbar click
        e.preventDefault();
      }}
    >
      {isLinkInputOpen ? (
        <form onSubmit={handleLinkSubmit} className="flex items-center gap-1 px-1 py-0.5">
          <input
            ref={inputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="bg-white/10 text-xs text-white placeholder:text-gray-400 px-2.5 py-1 rounded-full border border-white/15 focus:outline-none focus:border-purple-400 w-44"
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
            className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer"
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
            className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Bold (**text**)"
          >
            <Bold size={13} className="stroke-[2.5]" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => onFormat('italic')}
            className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Italic (*text*)"
          >
            <Italic size={13} />
          </button>

          {/* Underline */}
          <button
            type="button"
            onClick={() => onFormat('underline')}
            className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Underline (__text__)"
          >
            <Underline size={13} />
          </button>

          {/* Strikethrough */}
          <button
            type="button"
            onClick={() => onFormat('strike')}
            className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Strikethrough (~~text~~)"
          >
            <Strikethrough size={13} />
          </button>

          {/* Spoiler */}
          <button
            type="button"
            onClick={() => onFormat('spoiler')}
            className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-purple-300 transition-colors cursor-pointer active:scale-95"
            title="Spoiler (||secret||)"
          >
            <EyeOff size={13} />
          </button>

          {/* Quote */}
          <button
            type="button"
            onClick={() => onFormat('quote')}
            className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-white transition-colors cursor-pointer active:scale-95"
            title="Quote (> text)"
          >
            <Quote size={13} />
          </button>

          {/* Inline Code */}
          <button
            type="button"
            onClick={() => onFormat('code')}
            className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-purple-300 transition-colors cursor-pointer active:scale-95 font-mono text-[11px]"
            title="Inline code (`code`)"
          >
            <Code size={13} />
          </button>

          {/* Link */}
          <button
            type="button"
            onClick={() => setIsLinkInputOpen(true)}
            className="p-1.5 rounded-full hover:bg-white/15 text-gray-300 hover:text-sky-300 transition-colors cursor-pointer active:scale-95"
            title="Insert Link"
          >
            <LinkIcon size={13} />
          </button>
        </>
      )}
    </div>
  );
}
