import React, { useState } from 'react';
import { FileImage } from 'lucide-react';

interface AddGifButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  onGifSelect: (gif: string) => void;
}

const mockGifs = [
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbW9sc3A0b3g0Ym9pZnd5Ym9pZnd5Ym9pZnd5Ym9pZnd5JnB0Xz1mLg/a5viI92PAFUsU/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXN6MXN3bXN6MXN3bXN6MXN3bXN6MXN3bXN6MXN3bXN6JnB0Xz1mLg/du3J3cXyzhj75IOgvA/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbW9pZnd5Ym9pZnd5Ym9pZnd5Ym9pZnd5Ym9pZnd5JnB0Xz1mLg/l3q2zVr6cu95nF6O4/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbW9pZnd5Ym9pZnd5Ym9pZnd5Ym9pZnd5Ym9pZnd5JnB0Xz1mLg/3ntq5Fx7vH7E4/giphy.gif',
];

export const AddGifButton: React.FC<AddGifButtonProps> = ({ isOpen, onToggle, onGifSelect }) => {
  const [direction, setDirection] = useState<'top' | 'bottom'>('top');

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setDirection(rect.top < 280 ? 'bottom' : 'top');
    }
    onToggle();
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        title="Додати GIF"
        className={`p-2.5 rounded-xl transition-all duration-200 ${isOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
      >
        <FileImage size={18} />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 z-50 shadow-[0_10px_30px_rgba(0,0,0,0.5)] bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 animate-fadeIn p-3 w-[320px] backdrop-blur-md ${direction === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'}`}
        >
          <span className="text-xs font-semibold text-gray-400 px-1">Trends Giphy / Tenor</span>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar mt-2">
            {mockGifs.map((gif, index) => (
              <img
                key={index}
                src={gif}
                alt="gif"
                onClick={() => onGifSelect(gif)}
                className="rounded-lg h-16 w-full object-cover cursor-pointer hover:opacity-80 border border-white/5 transition-opacity"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
