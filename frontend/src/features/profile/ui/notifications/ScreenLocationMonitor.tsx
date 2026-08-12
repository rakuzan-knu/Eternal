import React from 'react';
import {
  NotificationPosition,
  useNotificationSettingsStore,
} from '@/shared/model/useNotificationSettingsStore';

interface ScreenLocationMonitorProps {
  hoveredCorner: NotificationPosition | null;
  onHoverCorner: (corner: NotificationPosition | null) => void;
}

const POSITIONS: NotificationPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export default function ScreenLocationMonitor({
  hoveredCorner,
  onHoverCorner,
}: ScreenLocationMonitorProps) {
  const { toastPosition, setToastPosition, maxToasts, setMaxToasts } =
    useNotificationSettingsStore();

  const getCornerClasses = (pos: NotificationPosition) => {
    const isSelected = toastPosition === pos;
    const isHovered = hoveredCorner === pos;
    const isActive = isHovered || isSelected;

    const basePos = {
      'top-left': 'top-2 left-2',
      'top-right': 'top-2 right-2',
      'bottom-left': 'bottom-2 left-2',
      'bottom-right': 'bottom-2 right-2',
    }[pos];

    return `${basePos} absolute w-[68px] p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
      isActive
        ? 'bg-[#1b3452]/90 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.35)] scale-105'
        : 'bg-[#182333]/70 border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
    }`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Location on the screen */}
      <div>
        <h3 className="px-1 mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Location on the screen
        </h3>

        <div className="relative flex flex-col items-center justify-center p-6 rounded-2xl border border-white/10 bg-[#0d1117]/80 backdrop-blur-md">
          {/* Monitor Display Frame */}
          <div className="relative w-full max-w-[340px] h-[190px] rounded-xl border-4 border-[#e2e8f0]/90 bg-[#1e293b] shadow-2xl overflow-hidden flex flex-col">
            {/* Monitor Screen Area */}
            <div className="relative flex-1 bg-[#1e3a5f] overflow-hidden select-none">
              {POSITIONS.map((pos) => {
                const isActive = (hoveredCorner || toastPosition) === pos;
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setToastPosition(pos)}
                    onMouseEnter={() => onHoverCorner(pos)}
                    onMouseLeave={() => onHoverCorner(null)}
                    className={getCornerClasses(pos)}
                  >
                    <div className="flex flex-col gap-1">
                      {Array.from({ length: Math.min(3, maxToasts) }).map((_, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                              isActive ? 'bg-sky-400' : 'bg-sky-700/60'
                            }`}
                          />
                          <div className="flex-1 flex flex-col gap-0.5">
                            <div
                              className={`h-1 rounded-full transition-colors ${
                                isActive ? 'bg-sky-300' : 'bg-sky-800/80'
                              }`}
                            />
                            <div
                              className={`h-0.5 rounded-full w-2/3 transition-colors ${
                                isActive ? 'bg-sky-400/70' : 'bg-sky-900/60'
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Monitor Stand */}
          <div className="w-24 h-6 bg-gradient-to-b from-[#cbd5e1] to-[#64748b] rounded-b-md shadow-md" />
          <div className="w-36 h-2 bg-[#94a3b8] rounded-full shadow-inner -mt-0.5" />
        </div>
      </div>

      {/* Notifications Count */}
      <div>
        <h3 className="px-1 mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Notifications count
        </h3>

        <div className="flex flex-col gap-2">
          {/* Segment Line */}
          <div className="flex items-center gap-1 px-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setMaxToasts(num)}
                className="flex-1 h-1.5 rounded-full relative group transition-all"
              >
                <div
                  className={`w-full h-full rounded-full transition-all duration-200 ${
                    maxToasts === num
                      ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                      : 'bg-white/10 group-hover:bg-white/20'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Step Numbers */}
          <div className="flex items-center justify-between text-xs font-medium px-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setMaxToasts(num)}
                className={`w-8 text-center transition-colors ${
                  maxToasts === num
                    ? 'text-sky-400 font-bold scale-110'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
