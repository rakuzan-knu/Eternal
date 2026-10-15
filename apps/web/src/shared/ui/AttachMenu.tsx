import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Image as ImageIcon, Paperclip, BarChart2 } from 'lucide-react';
import { useThemeStore, isCurrentThemeLight } from '@/shared/model/useThemeStore';
import { useLiquidGlassTheme } from '@/shared/lib/useLiquidGlassTheme';

interface AttachMenuProps {
  isGroup: boolean;
  disabled?: boolean;
  canSendMedia?: boolean;
  canSendPolls?: boolean;
  onPickMedia: (files: File[]) => void;
  onPickFile: (files: File[]) => void;
  onTogglePoll: () => void;
  buttonClassName?: string;
  iconSize?: number;
  usePortal?: boolean;
}

type AttachItemKey = 'media' | 'file' | 'poll';

export default function AttachMenu({
  isGroup,
  disabled,
  canSendMedia = true,
  canSendPolls = true,
  onPickMedia,
  onPickFile,
  onTogglePoll,
  buttonClassName,
  iconSize = 18,
  usePortal = true,
}: AttachMenuProps) {
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const EXIT_DURATION_MS = isTestEnv ? 0 : 150;

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [coords, setCoords] = useState<{ bottom: number; left: number } | null>(null);
  const [originStyle, setOriginStyle] = useState<string>('20px calc(100% + 28px)');

  const isLight = useThemeStore((s) => isCurrentThemeLight(s));
  const { popoverGradient, backdropFilter, WebkitBackdropFilter } = useLiquidGlassTheme();

  const updatePosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect || (rect.top === 0 && rect.bottom === 0 && rect.left === 0 && rect.width === 0)) {
      return;
    }
    const newBottom = Math.max(12, window.innerHeight - rect.top + 8);
    const newLeft = Math.max(12, Math.min(rect.left, window.innerWidth - 240));
    setCoords({
      bottom: newBottom,
      left: newLeft,
    });
    const btnCenterX = rect.left + rect.width / 2;
    const originX = Math.round(btnCenterX - newLeft);
    const originYOffset = Math.round(rect.height / 2 + 8);
    setOriginStyle(`${originX}px calc(100% + ${originYOffset}px)`);
  }, []);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    if (EXIT_DURATION_MS === 0) {
      setIsOpen(false);
      setIsClosing(false);
      return;
    }
    setIsClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      closeTimerRef.current = null;
    }, EXIT_DURATION_MS);
  }, [isClosing, EXIT_DURATION_MS]);

  const handleToggle = useCallback(() => {
    if (isOpen && !isClosing) {
      requestClose();
    } else {
      updatePosition();
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setIsClosing(false);
      setIsOpen(true);
    }
  }, [isOpen, isClosing, requestClose, updatePosition]);

  // Clean up close timer on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  // Position portal popover directly above the plus trigger button
  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current || !usePortal) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, usePortal, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !buttonRef.current?.contains(target)
      ) {
        requestClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, requestClose]);

  const handleItemClick = useCallback(
    (key: AttachItemKey) => {
      if (key === 'media') mediaInputRef.current?.click();
      else if (key === 'file') fileInputRef.current?.click();
      else onTogglePoll();
      requestClose();
    },
    [onTogglePoll, requestClose],
  );

  const items: { key: AttachItemKey; icon: React.ReactNode; label: string }[] = [
    { key: 'media', icon: <ImageIcon size={17} />, label: 'Photo or video' },
    { key: 'file', icon: <Paperclip size={17} />, label: 'File' },
    ...(isGroup ? [{ key: 'poll' as const, icon: <BarChart2 size={17} />, label: 'Poll' }] : []),
  ];

  const isButtonActive = isOpen && !isClosing;

  const menuPopup = (
    <div
      ref={menuRef}
      style={{
        ...(coords && usePortal
          ? { position: 'fixed', bottom: `${coords.bottom}px`, left: `${coords.left}px` }
          : {}),
        transformOrigin: originStyle,
        background: isLight
          ? 'rgba(255, 255, 255, 0.96)'
          : popoverGradient || 'rgba(20, 21, 28, 0.94)',
        backdropFilter: backdropFilter || 'blur(30px) saturate(190%)',
        WebkitBackdropFilter: WebkitBackdropFilter || 'blur(30px) saturate(190%)',
      }}
      className={`${
        coords && usePortal ? '' : 'absolute left-0 bottom-full mb-3'
      } w-56 glass-menu rounded-2xl p-1.5 ${
        isClosing ? 'animate-attachMenuCollapse pointer-events-none' : 'animate-attachMenuExpand'
      } z-[9999] transition-colors duration-150 ${
        isLight
          ? 'border border-black/10 shadow-[0_16px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)]'
          : 'border border-white/12 shadow-[0_16px_50px_rgba(0,0,0,0.65),0_2px_10px_rgba(0,0,0,0.4)]'
      }`}
    >
      {/* Top specular reflection line matching app theme */}
      <div
        className={`absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent ${
          isLight ? 'via-black/10' : 'via-white/25'
        } to-transparent pointer-events-none rounded-t-full`}
      />

      {items.map((item) => {
        const isItemRestricted =
          (item.key === 'media' && !canSendMedia) ||
          (item.key === 'file' && !canSendMedia) ||
          (item.key === 'poll' && !canSendPolls);

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => !isItemRestricted && handleItemClick(item.key)}
            disabled={isItemRestricted}
            title={isItemRestricted ? 'This action is restricted in this chat' : undefined}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 ${
              isItemRestricted
                ? isLight
                  ? 'opacity-40 cursor-not-allowed text-gray-400 bg-transparent'
                  : 'opacity-40 cursor-not-allowed text-gray-500 bg-transparent'
                : isLight
                  ? 'text-gray-800 hover:text-gray-950 hover:bg-black/5 active:scale-[0.98] cursor-pointer'
                  : 'text-gray-200 hover:text-white hover:bg-white/10 active:scale-[0.98] cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={
                  isItemRestricted
                    ? isLight
                      ? 'text-gray-400'
                      : 'text-gray-500'
                    : isLight
                      ? 'text-purple-600'
                      : 'text-purple-400'
                }
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>
            {isItemRestricted && (
              <span
                className={`text-[10px] font-normal px-1.5 py-0.5 rounded ${
                  isLight ? 'text-gray-500 bg-black/5' : 'text-gray-400 bg-white/5'
                }`}
              >
                Restricted
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="relative">
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*,.mp4,.mov,.mkv,.avi,.webm,.wmv,.3gp,.3g2,.mpeg,.mpg,.m4v"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onPickMedia(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onPickFile(Array.from(e.target.files));
          e.target.value = '';
        }}
      />

      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        title="Attach"
        aria-label="Attach"
        className={`flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
          buttonClassName || 'w-10 h-10'
        } ${
          isButtonActive
            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white rotate-45 shadow-lg shadow-purple-500/30'
            : isLight
              ? 'text-gray-700 hover:text-gray-950 hover:bg-black/5'
              : 'text-purple-400 hover:text-purple-300 hover:bg-white/10'
        }`}
      >
        <Plus size={iconSize} />
      </button>

      {isOpen &&
        (usePortal && typeof document !== 'undefined'
          ? createPortal(menuPopup, document.body)
          : menuPopup)}
    </div>
  );
}
