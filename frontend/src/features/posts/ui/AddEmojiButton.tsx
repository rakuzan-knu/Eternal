import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';

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
        title="Додати емодзі"
        className={`p-2.5 rounded-xl transition-all duration-200 ${isOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
      >
        <Smile size={18} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 animate-fadeIn ${direction === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'}`}
        >
          <EmojiPicker
            onEmojiClick={(emojiData) => onEmojiSelect(emojiData.emoji)}
            theme={Theme.DARK}
            emojiStyle={EmojiStyle.APPLE}
            searchDisabled={false}
            skinTonesDisabled={true}
            height={350}
            width={300}
          />
        </div>
      )}
    </div>
  );
};
