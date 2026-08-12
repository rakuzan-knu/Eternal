import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Smile } from 'lucide-react';
import type { EmojiStyle, Theme } from 'emoji-picker-react';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

interface AddEmojiButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  onEmojiSelect: (emoji: string) => void;
  forceDirection?: 'top' | 'bottom';
  usePortal?: boolean;
}

export const AddEmojiButton: React.FC<AddEmojiButtonProps> = ({
  isOpen,
  onToggle,
  onEmojiSelect,
  forceDirection,
  usePortal = false,
}) => {
  const [direction, setDirection] = useState<'top' | 'bottom'>('top');
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setDirection(forceDirection ?? (rect.top < 380 ? 'bottom' : 'top'));
    }
    onToggle();
  };

  useEffect(() => {
    if (!isOpen || !usePortal || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = 300;
      const height = 350;
      const gap = 12;
      const opensTop = forceDirection ? forceDirection === 'top' : direction === 'top';
      const preferredLeft = forceDirection === 'bottom' ? rect.left : rect.right - width;
      const left = Math.min(window.innerWidth - width - 12, Math.max(12, preferredLeft));
      const top = opensTop
        ? Math.max(12, rect.top - height - gap)
        : Math.min(window.innerHeight - height - 12, rect.bottom + gap);

      setPortalStyle({ position: 'fixed', left, top, width, zIndex: 620 });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [direction, forceDirection, isOpen, usePortal]);

  const picker = (
    <div
      className={`z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#1f1f23]/95 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-2xl backdrop-saturate-150 animate-fadeIn ${
        usePortal
          ? ''
          : `absolute left-0 ${direction === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'}`
      }`}
      style={usePortal ? (portalStyle ?? undefined) : undefined}
    >
      <Suspense
        fallback={
          <div className="flex h-[350px] w-[300px] items-center justify-center text-sm text-gray-500">
            Loading emojis...
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
              '--epr-category-label-bg-color': 'rgba(31, 31, 35, 0.85)',
              '--epr-dark-search-input-bg-color': 'rgba(255, 255, 255, 0.06)',
              '--epr-dark-hover-bg-color': 'rgba(255, 255, 255, 0.08)',
              '--epr-highlight-color': '#a78bfa',
              '--epr-picker-border-radius': '16px',
            } as React.CSSProperties
          }
        />
      </Suspense>
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        title="Add Emoji"
        className={`rounded-xl p-2.5 transition-all duration-200 ${
          isOpen ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
        }`}
      >
        <Smile size={18} />
      </button>

      {isOpen && (usePortal ? createPortal(picker, document.body) : picker)}
    </div>
  );
};
