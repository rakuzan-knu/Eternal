import React from 'react';
import { RefreshCw, CheckCircle2, PhoneOff } from 'lucide-react';
import { useCallStore } from '../../model/callStore';

interface ReconnectionOverlayProps {
  onCancelCall?: () => void;
}

export function ReconnectionOverlay({ onCancelCall }: ReconnectionOverlayProps) {
  const { isReconnecting, reconnectCountdown, reconnectRestored } = useCallStore();

  if (!isReconnecting && !reconnectRestored) return null;

  // Progress for 15s countdown
  const progressPercent = Math.max(0, Math.min(100, ((15 - reconnectCountdown) / 15) * 100));
  const strokeDashoffset = 283 - (283 * progressPercent) / 100;

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-2xl animate-fadeIn select-none">
      {reconnectRestored ? (
        /* Restored Success Card */
        <div className="flex flex-col items-center gap-4 text-center animate-bounce">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]">
            <CheckCircle2 size={36} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-wide">Связь восстановлена</h3>
            <p className="text-xs text-emerald-300/80 mt-1">WebRTC медиапотоки синхронизированы</p>
          </div>
        </div>
      ) : (
        /* Reconnecting In Progress */
        <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
          {/* Animated Ring with Countdown */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Pulsing radar waves */}
            <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping opacity-60 pointer-events-none" />
            <div className="absolute -inset-2 rounded-full bg-amber-500/20 animate-pulse pointer-events-none" />

            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                className="text-zinc-800"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="text-amber-400 transition-all duration-1000 ease-linear shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                fill="transparent"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-mono font-bold text-white tracking-tighter">
                {reconnectCountdown}
              </span>
              <span className="text-[10px] text-amber-300/80 uppercase font-medium">сек</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw size={18} className="text-amber-400 animate-spin" />
              <h3 className="text-lg font-semibold text-white tracking-wide">Переподключение...</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed max-w-xs mx-auto">
              Потеряно ICE-соединение. Выполняется автоматический ICE Restart и стабилизация сокета.
            </p>
          </div>

          {onCancelCall && (
            <button
              onClick={onCancelCall}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-800 hover:bg-rose-600/80 border border-white/10 text-xs font-medium text-gray-200 hover:text-white transition-all shadow-lg hover:scale-105"
            >
              <PhoneOff size={14} />
              <span>Завершить звонок</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
