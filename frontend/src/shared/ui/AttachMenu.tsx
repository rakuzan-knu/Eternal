import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, Image as ImageIcon, Paperclip, BarChart2 } from 'lucide-react';

interface AttachMenuProps {
  isGroup: boolean;
  disabled?: boolean;
  canSendMedia?: boolean;
  canSendPolls?: boolean;
  onPickMedia: (files: File[]) => void;
  onPickFile: (files: File[]) => void;
  onTogglePoll: () => void;
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
}: AttachMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleItemClick = useCallback(
    (key: AttachItemKey) => {
      if (key === 'media') mediaInputRef.current?.click();
      else if (key === 'file') fileInputRef.current?.click();
      else onTogglePoll();
      setIsOpen(false);
    },
    [onTogglePoll],
  );

  const items: { key: AttachItemKey; icon: React.ReactNode; label: string }[] = [
    { key: 'media', icon: <ImageIcon size={17} />, label: 'Photo or video' },
    { key: 'file', icon: <Paperclip size={17} />, label: 'File' },
    ...(isGroup ? [{ key: 'poll' as const, icon: <BarChart2 size={17} />, label: 'Poll' }] : []),
  ];

  return (
    <div className="relative" ref={menuRef}>
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
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
        onClick={() => setIsOpen((v) => !v)}
        disabled={disabled}
        title="Attach"
        className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
          isOpen
            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white rotate-45 shadow-lg shadow-purple-500/30'
            : 'text-purple-400 hover:text-purple-300 hover:bg-white/5'
        }`}
      >
        <Plus size={20} />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-3 w-56 bg-[#1c1c20]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] py-2 animate-popIn origin-bottom-left z-50">
          {items.map((item) => {
            const isItemRestricted =
              (item.key === 'media' && !canSendMedia) ||
              (item.key === 'file' && !canSendMedia) ||
              (item.key === 'poll' && !canSendPolls);

            return (
              <button
                key={item.key}
                onClick={() => !isItemRestricted && handleItemClick(item.key)}
                disabled={isItemRestricted}
                title={isItemRestricted ? 'This action is restricted in this chat' : undefined}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${
                  isItemRestricted
                    ? 'opacity-40 cursor-not-allowed text-gray-500'
                    : 'text-gray-200 hover:bg-white/5 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isItemRestricted ? 'text-gray-500' : 'text-purple-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {isItemRestricted && (
                  <span className="text-[10px] text-gray-400 font-normal">Restricted</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
