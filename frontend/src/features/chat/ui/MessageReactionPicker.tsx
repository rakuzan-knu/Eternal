import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Theme, EmojiStyle } from 'emoji-picker-react';
import { Plus } from 'lucide-react';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡', '🔥', '🎉', '💯', '👏', '🙏', '🌍'];

interface MessageReactionPickerProps {
  onPick: (emoji: string) => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

export default function MessageReactionPicker({
  onPick,
  onClose,
  align = 'left',
}: MessageReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isFullPickerOpen, setFullPickerOpen] = useState(false);
  const [poppedEmoji, setPoppedEmoji] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handlePick = (emoji: string) => {
    setPoppedEmoji(emoji);
    setTimeout(() => {
      onPick(emoji);
      onClose();
    }, 180);
  };

  return (
    <div
      ref={ref}
      className={`absolute bottom-full mb-2 z-50 ${align === 'right' ? 'right-0' : 'left-0'}`}
    >
      {isFullPickerOpen ? (
        <div className="shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] backdrop-blur-2xl backdrop-saturate-150 bg-white/[0.05] rounded-2xl overflow-hidden border border-white/10 animate-fadeIn">
          <Suspense
            fallback={
              <div className="w-[300px] h-[350px] flex items-center justify-center text-gray-500 text-sm">
                Loading emojis…
              </div>
            }
          >
            <EmojiPicker
              onEmojiClick={(emojiData) => handlePick(emojiData.emoji)}
              theme={'dark' as Theme}
              emojiStyle={'apple' as EmojiStyle}
              skinTonesDisabled
              lazyLoadEmojis
              previewConfig={{ showPreview: false }}
              height={350}
              width={300}
              style={
                {
                  '--epr-dark-bg-color': 'transparent',
                  '--epr-dark-picker-border-color': 'transparent',
                  '--epr-category-label-bg-color': 'rgba(20, 20, 24, 0.55)',
                  '--epr-dark-search-input-bg-color': 'rgba(255, 255, 255, 0.06)',
                  '--epr-dark-hover-bg-color': 'rgba(255, 255, 255, 0.08)',
                  '--epr-highlight-color': '#a78bfa',
                  '--epr-picker-border-radius': '16px',
                } as React.CSSProperties
              }
            />
          </Suspense>
        </div>
      ) : (
        <div className="flex items-center gap-0.5 bg-[#1c1c20]/95 backdrop-blur-2xl border border-white/10 rounded-full px-2 py-1.5 shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] animate-popIn">
          {QUICK_REACTIONS.map((emoji, index) => (
            <button
              key={emoji}
              onClick={() => handlePick(emoji)}
              style={{ animationDelay: `${index * 20}ms` }}
              className={`text-lg leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 hover:scale-125 active:scale-90 transition-transform duration-150 animate-popIn ${
                poppedEmoji === emoji ? 'animate-reactionBounce' : ''
              }`}
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={() => setFullPickerOpen(true)}
            title="More reactions"
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white hover:scale-110 transition-all duration-150"
          >
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
