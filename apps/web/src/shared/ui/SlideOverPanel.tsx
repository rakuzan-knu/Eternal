import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import { useSettingsPanelHost } from './SettingsPanelHost';

interface SlideOverPanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  isClosing?: boolean;
}

export default function SlideOverPanel({
  title,
  onClose,
  children,
  headerRight,
  isClosing: externalIsClosing,
}: SlideOverPanelProps) {
  const [internalIsClosing, setInternalIsClosing] = useState(false);
  const host = useSettingsPanelHost();
  const isClosing = Boolean(externalIsClosing || internalIsClosing);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setInternalIsClosing(true);
    setTimeout(onClose, 180);
  }, [isClosing, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestClose]);

  const positionClass = host ? 'absolute inset-0 z-40' : 'fixed inset-0 z-[310]';

  const content = (
    <div
      className={`${positionClass} flex flex-col glass-subpanel border-l border-black/10 dark:border-white/10 backdrop-blur-3xl text-gray-950 dark:text-white shadow-2xl ${
        isClosing ? 'animate-slideOutLeft' : 'animate-slideInLeft'
      }`}
    >
      <div className="flex items-center gap-2 px-4 h-16 flex-shrink-0 border-b border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={requestClose}
          aria-label="Back"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-950 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors active:scale-90 cursor-pointer"
        >
          <ArrowLeft size={18} className="text-gray-950 dark:text-white" />
        </button>
        <h2 className="text-base font-bold text-gray-950 dark:text-white flex-1 truncate">
          {title}
        </h2>
        {headerRight}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">{children}</div>
    </div>
  );

  return createPortal(content, host ?? document.body);
}
