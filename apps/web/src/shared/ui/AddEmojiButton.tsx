import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Smile } from 'lucide-react';
import type { EmojiStyle, Theme } from 'emoji-picker-react';
import { useThemeStore, isCurrentThemeLight } from '@/shared/model/useThemeStore';

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
  const isLight = useThemeStore(isCurrentThemeLight);
  const accentColor = useThemeStore((s) => s.accentColor);
  const [direction, setDirection] = useState<'top' | 'bottom'>('top');
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties | null>(null);
  const [originStyle, setOriginStyle] = useState<string>('calc(100% - 18px) calc(100% + 24px)');
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const EXIT_DURATION_MS = isTestEnv ? 0 : 150;

  const [mounted, setMounted] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  // Sync mounted & isClosing state with external isOpen
  useEffect(() => {
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setMounted(true);
      setIsClosing(false);
    } else if (mounted && !isClosing) {
      if (EXIT_DURATION_MS === 0) {
        setMounted(false);
        setIsClosing(false);
      } else {
        setIsClosing(true);
        closeTimerRef.current = setTimeout(() => {
          setMounted(false);
          setIsClosing(false);
          closeTimerRef.current = null;
        }, EXIT_DURATION_MS);
      }
    }
  }, [isOpen, mounted, isClosing, EXIT_DURATION_MS]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

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

    const btnCenterX = rect.left + rect.width / 2;
    const originX = Math.round(btnCenterX - left);
    const originY = opensTop ? 'calc(100% + 18px)' : '-18px';
    setOriginStyle(`${originX}px ${originY}`);
  };

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isOpen) {
      const rect = e.currentTarget.getBoundingClientRect();
      const dir = forceDirection ?? (rect.top < 380 ? 'bottom' : 'top');
      setDirection(dir);
      updatePosition();
    }
    onToggle();
  };

  // Fixed Portal Positioning relative to button trigger
  useEffect(() => {
    if (!mounted || !usePortal || !buttonRef.current) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [direction, forceDirection, mounted, usePortal]);

  // Outside click & Escape key dismiss
  useEffect(() => {
    if (!mounted || isClosing) return;

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
  }, [mounted, isClosing, onToggle]);

  const nonPortalOrigin =
    direction === 'top' ? 'calc(100% - 18px) calc(100% + 24px)' : 'calc(100% - 18px) -24px';

  const picker = (
    <div
      ref={pickerRef}
      className={`overflow-hidden rounded-2xl border border-black/10 dark:border-white/15 glass-modal shadow-2xl backdrop-blur-3xl ${
        isClosing ? 'animate-attachMenuCollapse pointer-events-none' : 'animate-attachMenuExpand'
      } ${
        usePortal
          ? 'z-[99999]'
          : `z-50 absolute right-0 ${direction === 'top' ? 'bottom-full mb-3' : 'top-full mt-3'} max-w-[calc(100vw-24px)]`
      }`}
      style={{
        ...(usePortal ? (portalStyle ?? {}) : {}),
        transformOrigin: usePortal ? originStyle : nonPortalOrigin,
      }}
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
          theme={isLight ? ('light' as Theme) : ('dark' as Theme)}
          emojiStyle={'apple' as EmojiStyle}
          searchDisabled={false}
          skinTonesDisabled={true}
          lazyLoadEmojis={true}
          previewConfig={{ showPreview: false }}
          height={380}
          width="100%"
          style={
            {
              '--epr-bg-color': 'transparent',
              '--epr-dark-bg-color': 'transparent',
              '--epr-picker-border-color': 'transparent',
              '--epr-dark-picker-border-color': 'transparent',
              '--epr-category-label-bg-color': 'var(--app-glass-modal-bg, rgba(14, 16, 23, 0.95))',
              '--epr-search-input-bg-color': isLight
                ? 'rgba(0, 0, 0, 0.05)'
                : 'rgba(255, 255, 255, 0.08)',
              '--epr-dark-search-input-bg-color': 'rgba(255, 255, 255, 0.08)',
              '--epr-hover-bg-color': isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.1)',
              '--epr-dark-hover-bg-color': 'rgba(255, 255, 255, 0.1)',
              '--epr-highlight-color': accentColor || '#a855f7',
              '--epr-picker-border-radius': '16px',
            } as React.CSSProperties
          }
        />
      </Suspense>
    </div>
  );

  const isButtonActive = (isOpen || mounted) && !isClosing;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        title="Add Emoji"
        className={`rounded-xl p-2 transition-all duration-200 cursor-pointer ${
          isButtonActive
            ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 scale-105'
            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
        } ${buttonClassName}`}
      >
        <Smile size={18} />
      </button>

      {mounted && (usePortal ? createPortal(picker, document.body) : picker)}
    </div>
  );
};
