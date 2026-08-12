import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft } from 'lucide-react';
import { useSettingsPanelHost } from './SettingsPanelHost';

interface SlideOverPanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

export default function SlideOverPanel({
  title,
  onClose,
  children,
  headerRight,
}: SlideOverPanelProps) {
  const [isClosing, setIsClosing] = useState(false);
  const host = useSettingsPanelHost();

  const requestClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
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
      className={`${positionClass} flex flex-col bg-[#1a1a1a] ${
        isClosing ? 'animate-slideOutLeft' : 'animate-slideInLeft'
      }`}
    >
      <div className="flex items-center gap-2 px-4 h-16 flex-shrink-0 border-b border-white/5">
        <button
          onClick={requestClose}
          aria-label="Back"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-base font-bold text-white flex-1 truncate">{title}</h2>
        {headerRight}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">{children}</div>
    </div>
  );

  return createPortal(content, host ?? document.body);
}
