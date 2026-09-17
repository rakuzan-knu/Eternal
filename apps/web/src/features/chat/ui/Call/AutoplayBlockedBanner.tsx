import React from 'react';
import { VolumeX, Play } from 'lucide-react';

interface AutoplayBlockedBannerProps {
  onUnblock: () => void;
}

export function AutoplayBlockedBanner({ onUnblock }: AutoplayBlockedBannerProps) {
  return (
    <div
      onClick={onUnblock}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500/90 hover:bg-amber-500 text-black font-medium shadow-2xl backdrop-blur-xl border border-amber-300/40 cursor-pointer animate-bounce transition-all hover:scale-105 select-none max-w-md w-[90%]"
      role="alert"
    >
      <div className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
        <VolumeX size={20} className="text-black" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="text-xs font-bold uppercase tracking-wider">
          Звук заблокирован браузером
        </div>
        <p className="text-[11px] opacity-90 truncate">
          Нажмите здесь, чтобы включить звук участников
        </p>
      </div>
      <div className="px-3 py-1.5 rounded-xl bg-black text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shrink-0">
        <Play size={12} fill="currentColor" />
        <span>Включить</span>
      </div>
    </div>
  );
}
