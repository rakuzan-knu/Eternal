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
  className?: string;
  buttonClassName?: string;
}

export const AddEmojiButton: React.FC<AddEmojiButtonProps> = ({
  isOpen,
  onToggle,
  onEmojiSelect,
  forceDirection,
  usePortal = false,
  className = '',
  buttonClassName = '',
}) => {
  const [direction, setDirection] = useState<'top' | 'bottom'>('top');
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      setDirection(forceDirection ?? (rect.top < 380 ? 'bottom' : 'top'));
    }
    onToggle();
  };

  // Fixed Portal Positioning relative to button trigger
  useEffect(() => {
    if (!isOpen || !usePortal || !buttonRef.current) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      const width = Math.min(320, window.innerWidth - 24);
      const height = 380;
      const gap = 8;

      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      const opensTop = forceDirection
        ? forceDirection === 'top'
        : spaceBelow < height + gap && spaceAbove > spaceBelow;

      // Center horizontally relative to button or clamp cleanly
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
  }, [direction, forceDirection, isOpen, usePortal]);

  // Outside click & Escape key dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
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

  const picker = (
    <div
      ref={pickerRef}
      className={`overflow-hidden rounded-2xl border border-white/15 bg-[#0e1017]/95 shadow-[0_25px_70px_rgba(0,0,0,0.85),0_0_40px_rgba(147,51,234,0.25)] backdrop-blur-3xl backdrop-saturate-150 animate-popIn ${
        usePortal
          ? 'z-[99999]'
          : `z-50 absolute right-0 ${direction === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'} max-w-[calc(100vw-24px)]`
      }`}
      style={usePortal ? (portalStyle ?? undefined) : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <Suspense
        fallback={
          <div className="flex h-[350px] w-[300px] sm:w-[320px] items-center justify-center text-sm text-purple-400">
            <div className="w-5 h-5 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
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
          height={380}
          width="100%"
          style={
            {
              '--epr-dark-bg-color': 'transparent',
              '--epr-dark-picker-border-color': 'transparent',
              '--epr-category-label-bg-color': 'rgba(14, 16, 23, 0.9)',
              '--epr-dark-search-input-bg-color': 'rgba(255, 255, 255, 0.08)',
              '--epr-dark-hover-bg-color': 'rgba(255, 255, 255, 0.1)',
              '--epr-highlight-color': '#a855f7',
              '--epr-picker-border-radius': '16px',
            } as React.CSSProperties
          }
        />
      </Suspense>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        title="Add Emoji"
        className={`rounded-xl p-2 transition-all duration-200 cursor-pointer ${
          isOpen
            ? 'bg-purple-500/20 text-purple-300'
            : 'text-gray-400 hover:bg-white/10 hover:text-white'
        } ${buttonClassName}`}
      >
        <Smile size={18} />
      </button>

      {isOpen && (usePortal ? createPortal(picker, document.body) : picker)}
    </div>
  );
};
