import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useChatActivityMap } from '../model/useChatActivityMap';
import type { DayActivityItem } from '../../../entities/chat/model/types';

export interface ChatDatePickerProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  initialDate?: Date | null;
  anchorRect?: DOMRect | null;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ChatDatePicker({
  conversationId,
  isOpen,
  onClose,
  onSelectDate,
  initialDate,
  anchorRect,
}: ChatDatePickerProps) {
  const now = useMemo(() => new Date(), []);
  const baseDate = initialDate || now;

  const [currentYear, setCurrentYear] = useState<number>(baseDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(baseDate.getMonth() + 1); // 1-indexed (1..12)
  const [focusedDay, setFocusedDay] = useState<number>(baseDate.getDate());
  const [viewMode, setViewMode] = useState<'calendar' | 'roller'>('calendar');

  // Month & Year roller selection state
  const [rollerMonth, setRollerMonth] = useState<number>(baseDate.getMonth() + 1);
  const [rollerYear, setRollerYear] = useState<number>(baseDate.getFullYear());

  // Hover preview tooltip state
  const [hoveredDayData, setHoveredDayData] = useState<{
    date: Date;
    data: DayActivityItem;
    x: number;
    y: number;
  } | null>(null);

  // Position & collision detection for desktop popover
  const [coords, setCoords] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch monthly message activity map (cached with TanStack query)
  const { activityMap } = useChatActivityMap(conversationId, {
    year: currentYear,
    month: currentMonth,
  });

  // Check mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sync initial date if changed
  useEffect(() => {
    if (initialDate) {
      setCurrentYear(initialDate.getFullYear());
      setCurrentMonth(initialDate.getMonth() + 1);
      setFocusedDay(initialDate.getDate());
      setRollerYear(initialDate.getFullYear());
      setRollerMonth(initialDate.getMonth() + 1);
    }
  }, [initialDate, isOpen]);

  // Viewport-aware collision positioning on desktop
  useLayoutEffect(() => {
    if (!isOpen || isMobile) return;

    const width = 320;
    const height = 390;
    const gap = 10;

    if (anchorRect) {
      const spaceBelow = window.innerHeight - anchorRect.bottom;
      const spaceAbove = anchorRect.top;

      let top: number;
      if (spaceBelow < height && spaceAbove > spaceBelow) {
        // Flip upwards
        top = Math.max(16, anchorRect.top - height - gap);
      } else {
        // Downwards
        top = Math.max(16, Math.min(anchorRect.bottom + gap, window.innerHeight - height - 16));
      }

      // Horizontal alignment: Center over anchor or clamp within viewport
      const anchorCenterX = anchorRect.left + anchorRect.width / 2;
      let left = anchorCenterX - width / 2;
      if (left < 16) left = 16;
      if (left + width > window.innerWidth - 16) {
        left = window.innerWidth - width - 16;
      }

      setCoords({ top, left });
    } else {
      // Center in screen if no anchor rect
      setCoords({
        top: Math.max(16, (window.innerHeight - height) / 2),
        left: Math.max(16, (window.innerWidth - width) / 2),
      });
    }
  }, [isOpen, anchorRect, isMobile, viewMode]);

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  // First weekday of current month (0: Mon, 1: Tue ... 6: Sun)
  const firstDayOfWeekIndex = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    return (firstDay + 6) % 7; // Convert Sunday=0 to Monday=0
  }, [currentYear, currentMonth]);

  // Days in previous month
  const prevMonthDays = useMemo(() => {
    return new Date(currentYear, currentMonth - 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // Calendar cells generation (prev trailing days, current month days, next leading days)
  const calendarCells = useMemo(() => {
    const cells: Array<{
      day: number;
      monthOffset: -1 | 0 | 1;
      date: Date;
      dayKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      activity?: DayActivityItem;
    }> = [];

    const monthStr = String(currentMonth).padStart(2, '0');

    // 1. Previous month trailing days
    for (let i = firstDayOfWeekIndex - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevM = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevY = currentMonth === 1 ? currentYear - 1 : currentYear;
      const date = new Date(prevY, prevM - 1, day);
      const dayKey = `${prevY}-${String(prevM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        day,
        monthOffset: -1,
        date,
        dayKey,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dayKey = `${currentYear}-${monthStr}-${dayStr}`;
      const date = new Date(currentYear, currentMonth - 1, day);
      const isToday =
        now.getFullYear() === currentYear &&
        now.getMonth() + 1 === currentMonth &&
        now.getDate() === day;
      const isSelected =
        baseDate.getFullYear() === currentYear &&
        baseDate.getMonth() + 1 === currentMonth &&
        baseDate.getDate() === day;

      cells.push({
        day,
        monthOffset: 0,
        date,
        dayKey,
        isCurrentMonth: true,
        isToday,
        isSelected,
        activity: activityMap[dayKey],
      });
    }

    // 3. Next month leading days (to complete 5 or 6 rows of 7 = multiple of 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const nextM = currentMonth === 12 ? 1 : currentMonth + 1;
      const nextY = currentMonth === 12 ? currentYear + 1 : currentYear;
      const date = new Date(nextY, nextM - 1, day);
      const dayKey = `${nextY}-${String(nextM).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        day,
        monthOffset: 1,
        date,
        dayKey,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
      });
    }

    return cells;
  }, [
    currentYear,
    currentMonth,
    firstDayOfWeekIndex,
    prevMonthDays,
    daysInMonth,
    now,
    baseDate,
    activityMap,
  ]);

  // Navigation handlers
  const handlePrevMonth = useCallback(() => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const handleNextMonth = useCallback(() => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const handleJumpToToday = () => {
    const today = new Date();
    onSelectDate(today);
    onClose();
  };

  const handleSelectDay = useCallback(
    (cellDate: Date) => {
      onSelectDate(cellDate);
      onClose();
    },
    [onClose, onSelectDate],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (viewMode === 'roller') {
        if (e.key === 'Escape') {
          setViewMode('calendar');
        }
        return;
      }

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusedDay((prev) => {
          if (prev <= 1) {
            handlePrevMonth();
            return 28;
          }
          return prev - 1;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusedDay((prev) => {
          if (prev >= daysInMonth) {
            handleNextMonth();
            return 1;
          }
          return prev + 1;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedDay((prev) => {
          if (prev <= 7) {
            handlePrevMonth();
            return 25;
          }
          return prev - 7;
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedDay((prev) => {
          if (prev + 7 > daysInMonth) {
            handleNextMonth();
            return 1;
          }
          return prev + 7;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const targetDate = new Date(currentYear, currentMonth - 1, focusedDay);
        handleSelectDay(targetDate);
      }
    },
    [
      viewMode,
      focusedDay,
      daysInMonth,
      currentYear,
      currentMonth,
      onClose,
      handlePrevMonth,
      handleNextMonth,
      handleSelectDay,
    ],
  );

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const content = (
    <div
      ref={popoverRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{
        background: 'rgba(15, 14, 23, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(147, 51, 234, 0.15)',
        ...(isMobile
          ? {}
          : coords
            ? { position: 'fixed', top: `${coords.top}px`, left: `${coords.left}px` }
            : { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
      }}
      className={`z-50 select-none outline-none animate-modalPop ${
        isMobile
          ? 'fixed bottom-0 left-0 right-0 rounded-t-3xl p-5 border-t max-h-[85vh] overflow-y-auto'
          : 'w-[320px] p-4 rounded-2xl'
      }`}
    >
      {isMobile && <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />}

      {viewMode === 'calendar' ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-3.5">
            <button
              type="button"
              onClick={() => {
                setRollerYear(currentYear);
                setRollerMonth(currentMonth);
                setViewMode('roller');
              }}
              className="flex items-center gap-1.5 px-2 py-1 -ml-1 rounded-lg text-sm font-bold text-white hover:bg-white/10 hover:text-purple-300 transition group cursor-pointer"
              title="Click to select month and year"
            >
              <span>
                {MONTH_NAMES[currentMonth - 1]} {currentYear}
              </span>
              <ChevronRight
                size={14}
                className="text-gray-400 group-hover:text-purple-300 transition-transform group-hover:translate-x-0.5"
              />
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer"
                title="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer"
                title="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {WEEKDAY_NAMES.map((w) => (
              <span key={w} className="text-[11px] font-medium text-gray-400">
                {w}
              </span>
            ))}
          </div>

          {/* 7-Column Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-1.5 gap-x-1 justify-items-center relative">
            {calendarCells.map((cell) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={cell.dayKey}
                    className="w-9 h-9 flex items-center justify-center text-xs text-white/20 select-none cursor-default"
                  >
                    {cell.day}
                  </div>
                );
              }

              const hasActivity = Boolean(cell.activity && cell.activity.messageCount > 0);
              const hasMedia = Boolean(cell.activity?.previewMediaUrl);
              const isFocused = cell.day === focusedDay;

              if (hasMedia && cell.activity?.previewMediaUrl) {
                return (
                  <div
                    key={cell.dayKey}
                    onClick={() => handleSelectDay(cell.date)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredDayData({
                        date: cell.date,
                        data: cell.activity!,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredDayData(null);
                    }}
                    className={`relative w-9 h-9 rounded-full overflow-hidden flex items-center justify-center group cursor-pointer transition transform hover:scale-110 shadow-md ${
                      cell.isSelected
                        ? 'ring-2 ring-purple-400 shadow-purple-500/50'
                        : isFocused
                          ? 'ring-2 ring-sky-400'
                          : ''
                    }`}
                  >
                    {/* Blurred / Dimmed Thumbnail */}
                    <img
                      src={cell.activity.previewMediaUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover brightness-[0.45] group-hover:brightness-[0.6] transition duration-200"
                    />
                    <span className="relative z-10 text-xs font-bold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                      {cell.day}
                    </span>
                  </div>
                );
              }

              if (hasActivity) {
                return (
                  <button
                    key={cell.dayKey}
                    type="button"
                    onClick={() => handleSelectDay(cell.date)}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredDayData({
                        date: cell.date,
                        data: cell.activity!,
                        x: rect.left + rect.width / 2,
                        y: rect.top,
                      });
                    }}
                    onMouseLeave={() => {
                      setHoveredDayData(null);
                    }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs cursor-pointer transition transform hover:scale-110 shadow-sm ${
                      cell.isSelected
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/50 ring-2 ring-purple-400/60'
                        : 'bg-white/10 hover:bg-purple-600/40 text-white'
                    } ${isFocused ? 'ring-2 ring-sky-400' : ''}`}
                  >
                    {cell.day}
                  </button>
                );
              }

              // Day with no messages
              return (
                <button
                  key={cell.dayKey}
                  type="button"
                  onClick={() => handleSelectDay(cell.date)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs text-white/40 hover:text-white hover:bg-white/5 transition ${
                    cell.isToday ? 'border border-purple-500/50 text-purple-300 font-bold' : ''
                  } ${isFocused ? 'ring-2 ring-sky-400/50' : ''}`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleJumpToToday}
              className="text-xs font-medium text-purple-400 hover:text-purple-300 transition cursor-pointer"
            >
              Jump to Today
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium text-gray-400 hover:text-white transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </>
      ) : (
        /* Month & Year Roller View (Telegram Desktop Style) */
        <div className="flex flex-col py-1">
          <div className="text-center mb-3">
            <h3 className="text-sm font-semibold text-white">Select Month & Year</h3>
          </div>

          <div className="relative h-48 my-1 flex items-center justify-around overflow-hidden">
            {/* Active Selection Center Indicator Lines */}
            <div className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 h-10 border-t border-b border-purple-500/40 bg-purple-500/10 rounded-lg" />

            {/* Months Column */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar flex flex-col items-center py-16 gap-2 snap-y snap-mandatory">
              {MONTH_NAMES.map((name, idx) => {
                const mNumber = idx + 1;
                const isSelected = mNumber === rollerMonth;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setRollerMonth(mNumber)}
                    className={`py-1 px-3 rounded-lg text-sm transition-all snap-center cursor-pointer ${
                      isSelected
                        ? 'font-bold scale-110 text-purple-300'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {/* Years Column */}
            <div className="flex-1 h-full overflow-y-auto custom-scrollbar flex flex-col items-center py-16 gap-2 snap-y snap-mandatory">
              {Array.from({ length: 15 }, (_, i) => now.getFullYear() - 10 + i).map((yr) => {
                const isSelected = yr === rollerYear;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => setRollerYear(yr)}
                    className={`py-1 px-3 rounded-lg text-sm transition-all snap-center cursor-pointer ${
                      isSelected
                        ? 'font-bold scale-110 text-purple-300'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roller View Footer */}
          <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentYear(rollerYear);
                setCurrentMonth(rollerMonth);
                setViewMode('calendar');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              Show
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Backdrop for Mobile or Modal Mode */}
      {isMobile && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fadeIn"
        />
      )}

      {/* Floating Mini-Preview Tooltip */}
      {hoveredDayData && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredDayData.x}px`,
            top: `${hoveredDayData.y - 12}px`,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(20, 18, 30, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(168, 85, 247, 0.3)',
          }}
          className="z-50 pointer-events-none p-2.5 rounded-xl text-left min-w-40 max-w-55 animate-popIn"
        >
          <p className="text-[11px] font-bold text-purple-300">
            {hoveredDayData.date.toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
          <p className="text-[10px] text-gray-300 font-medium mt-0.5">
            {hoveredDayData.data.messageCount}{' '}
            {hoveredDayData.data.messageCount === 1 ? 'message' : 'messages'}
            {hoveredDayData.data.mediaCount ? `, ${hoveredDayData.data.mediaCount} media` : ''}
          </p>
          {hoveredDayData.data.firstMessageSnippet && (
            <p className="text-[10px] text-gray-400 italic truncate mt-1 pt-1 border-t border-white/10">
              "{hoveredDayData.data.firstMessageSnippet}"
            </p>
          )}
        </div>
      )}

      {createPortal(content, document.body)}
    </>
  );
}
