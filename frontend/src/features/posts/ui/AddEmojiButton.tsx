import React, { useState, lazy, Suspense } from 'react';
import { Smile } from 'lucide-react';
import type { Theme, EmojiStyle } from 'emoji-picker-react';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

interface AddEmojiButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  onEmojiSelect: (emoji: string) => void;
}

export const AddEmojiButton: React.FC<AddEmojiButtonProps> = ({
  isOpen,
  onToggle,
  onEmojiSelect,
}) => {
  const [direction, setDirection] = useState<'top' | 'bottom'>('top');

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setDirection(rect.top < 380 ? 'bottom' : 'top');
    }
    onToggle();
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        title="Add Emojі"
        className={`p-2.5 rounded-xl transition-all duration-200 ${isOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
      >
        <Smile size={18} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl backdrop-saturate-150 bg-white/[0.05] rounded-2xl overflow-hidden border border-white/10 animate-fadeIn ${direction === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'}`}
        >
          <Suspense
            fallback={
              <div className="w-[300px] h-[350px] flex items-center justify-center text-gray-500 text-sm">
                Loading emojis…
              </div>
            }
          >
            <EmojiPicker
              onEmojiClick={(emojiData) => onEmojiSelect(emojiData.emoji)}
              theme={'dark' as Theme}
              emojiStyle={'apple' as EmojiStyle}
              searchDisabled={false}
              skinTonesDisabled={true}
              lazyLoadEmojis={true}
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
      )}
    </div>
  );
};
