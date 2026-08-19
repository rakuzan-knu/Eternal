import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileImage } from 'lucide-react';

interface AddGifButtonProps {
  isOpen: boolean;
  disabled?: boolean;
  title?: string;
  onToggle: () => void;
  onGifSelect: (gif: string) => void;
  usePortal?: boolean;
  className?: string;
}

const mockGifs = [
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbW9sc3A0b3g0Ym9pZnd5Ym9pZnd5Ym9pZnd5Ym9pZnd5JnB0Xz1mLg/a5viI92PAFUsU/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXN6MXN3bXN6MXN3bXN6MXN3bXN6MXN3bXN6MXN3bXN6JnB0Xz1mLg/du3J3cXyzhj75IOgvA/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbW9pZnd5Ym9pZnd5Ym9pZnd5Ym9pZnd5Ym9pZnd5JnB0Xz1mLg/l3q2zVr6cu95nF6O4/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbW9pZnd5Ym9pZnd5Ym9pZnd5Ym9pZnd5Ym9pZnd5JnB0Xz1mLg/3ntq5Fx7vH7E4/giphy.gif',
];

export const AddGifButton: React.FC<AddGifButtonProps> = ({
  isOpen,
  disabled = false,
  title = 'Add GIF',
  onToggle,
  onGifSelect,
  usePortal = false,
  className = '',
}) => {
  const [direction, setDirection] = useState<'top' | 'bottom'>('top');
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (disabled) return;
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setDirection(rect.top < 280 ? 'bottom' : 'top');
    }
    onToggle();
  };

  useEffect(() => {
    if (!isOpen || !usePortal || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(320, window.innerWidth - 24);
      const height = 240;
      const gap = 8;

      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const opensTop = spaceBelow < height + gap && spaceAbove > spaceBelow;

      const preferredLeft = rect.left + rect.width / 2 - width / 2;
      const left = Math.min(window.innerWidth - width - 12, Math.max(12, preferredLeft));
      const top = opensTop
        ? Math.max(12, rect.top - height - gap)
        : Math.min(window.innerHeight - height - 12, rect.bottom + gap);

      setPortalStyle({
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        zIndex: 99999,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, usePortal]);

  // Outside click & Escape dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        onToggle();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onToggle();
      }
    };

    document.addEventListener('mousedown', handlePointerDown, true);
    document.addEventListener('touchstart', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true);
      document.removeEventListener('touchstart', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onToggle]);

  const panel = (
    <div
      ref={panelRef}
      className={`shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_40px_rgba(147,51,234,0.2)] bg-[#0e1017]/95 rounded-2xl overflow-hidden border border-white/15 animate-popIn p-3 w-[320px] max-w-[calc(100vw-24px)] backdrop-blur-3xl backdrop-saturate-150 ${
        usePortal
          ? 'z-[99999]'
          : `z-50 absolute right-0 ${direction === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'}`
      }`}
      style={usePortal ? (portalStyle ?? undefined) : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-semibold text-gray-300">Trending GIFs</span>
        <span className="text-[10px] text-purple-400 font-medium">Giphy</span>
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        {mockGifs.map((gif, index) => (
          <img
            key={index}
            src={gif}
            alt="gif"
            onClick={() => {
              onGifSelect(gif);
              onToggle();
            }}
            className="rounded-xl h-18 w-full object-cover cursor-pointer hover:opacity-90 hover:scale-[1.02] border border-white/10 transition-all duration-200"
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        title={title}
        className={`p-2 rounded-xl transition-all duration-200 cursor-pointer ${
          disabled
            ? 'opacity-40 cursor-not-allowed text-gray-500'
            : isOpen
              ? 'bg-purple-500/20 text-purple-300'
              : 'text-gray-400 hover:bg-white/10 hover:text-white'
        }`}
      >
        <FileImage size={18} />
      </button>

      {!disabled && isOpen && (usePortal ? createPortal(panel, document.body) : panel)}
    </div>
  );
};
