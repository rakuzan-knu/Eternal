import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, Image as ImageIcon, Paperclip, BarChart2 } from 'lucide-react';

interface AttachMenuProps {
  isGroup: boolean;
  disabled?: boolean;
  onPickMedia: (files: File[]) => void;
  onPickFile: (files: File[]) => void;
  onTogglePoll: () => void;
}

type AttachItemKey = 'media' | 'file' | 'poll';

export default function AttachMenu({
  isGroup,
  disabled,
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
        className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
          isOpen ? 'bg-blue-500 text-white rotate-45' : 'text-blue-400 hover:bg-white/5'
        }`}
      >
        <Plus size={22} />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-3 w-52 bg-[#1c1c20]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_12px_40px_0_rgba(0,0,0,0.6)] py-2 animate-popIn origin-bottom-left z-50">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => handleItemClick(item.key)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/5 transition-colors"
            >
              <span className="text-blue-400">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
