import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, Clock, Zap, Smile, PartyPopper } from 'lucide-react';
import { triggerReactionBurst } from '../lib/reactionBurstEngine';
import { getStoredRecentReactions } from '../model/useRecentReactions';
import TelegramAppleEmoji from './Call/TelegramAppleEmoji';

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

const EXPANDED_REACTIONS: {
  id: string;
  name: string;
  icon: React.ReactNode;
  emojis: string[];
}[] = [
  {
    id: 'recent',
    name: 'Recent',
    icon: <Clock size={16} />,
    emojis: [], // Dynamically populated from getStoredRecentReactions()
  },
  {
    id: 'popular',
    name: 'Popular',
    icon: <Zap size={16} />,
    emojis: [
      '❤️',
      '🫡',
      '🏆',
      '😎',
      '🔥',
      '😭',
      '👍',
      '😁',
      '🥹',
      '❤️‍🔥',
      '😇',
      '🥰',
      '👎',
      '👏',
      '🤔',
      '🤯',
      '😱',
      '🤬',
      '🎉',
      '🤩',
      '🤮',
      '💩',
      '🙏',
      '🤌',
      '🕊️',
      '🤡',
      '🤭',
      '🥴',
      '😍',
      '🐳',
      '🌚',
      '🌭',
      '💯',
      '😆',
      '⚡',
    ],
  },
  {
    id: 'mood',
    name: 'Mood & Faces',
    icon: <Smile size={16} />,
    emojis: [
      '🍌',
      '💔',
      '🤨',
      '😐',
      '🍓',
      '💋',
      '🖕',
      '😈',
      '😴',
      '🤓',
      '👻',
      '👩‍💻',
      '👀',
      '🎃',
      '🐵',
      '😨',
      '🤝',
      '✍️',
      '🤣',
      '🎅',
      '🎄',
      '☃️',
      '💅',
      '🤪',
      '🗿',
      '🆒',
      '💗',
      '🙈',
      '🦄',
      '🌝',
      '💊',
      '🙉',
      '👾',
      '🤷‍♂️',
      '🤷‍♀️',
      '🤦‍♀️',
      '😡',
      '🤐',
      '🥱',
      '🤤',
    ],
  },
  {
    id: 'celebrate',
    name: 'Celebration',
    icon: <PartyPopper size={16} />,
    emojis: ['🍾', '⭐', '✨', '🥳', '🎁', '🎂', '🎈'],
  },
];

const PICKER_WIDTH = 345;
const PICKER_HEIGHT = 440;
const PADDING = 12;

interface PositionState {
  top: number;
  left: number;
  placementY: 'above' | 'below';
  transformOrigin: string;
}

function calculatePosition(
  anchor: HTMLElement | null,
  align: 'left' | 'right' = 'left',
  coords?: { x: number; y: number } | null,
): PositionState {
  if (typeof window === 'undefined') {
    return { top: 0, left: 0, placementY: 'above', transformOrigin: 'bottom right' };
  }

  const vWidth = window.innerWidth || 1024;
  const vHeight = window.innerHeight || 768;

  let rect: DOMRect;
  if (coords) {
    rect = new DOMRect(coords.x, coords.y, 24, 24);
  } else if (anchor) {
    rect = anchor.getBoundingClientRect();
  } else {
    rect = new DOMRect(
      align === 'right' ? vWidth - PICKER_WIDTH - PADDING : PADDING,
      Math.max(PADDING, vHeight / 2 - 200),
      100,
      30,
    );
  }

  const spaceAbove = rect.top - PADDING;
  const spaceBelow = vHeight - rect.bottom - PADDING;

  let placementY: 'above' | 'below' = 'above';
  let top = 0;

  if (spaceAbove >= PICKER_HEIGHT + 8) {
    placementY = 'above';
    top = rect.top - PICKER_HEIGHT - 8;
  } else if (spaceBelow >= PICKER_HEIGHT + 8) {
    placementY = 'below';
    top = rect.bottom + 8;
  } else {
    if (spaceAbove >= spaceBelow) {
      placementY = 'above';
      top = Math.max(PADDING, rect.top - PICKER_HEIGHT - 8);
    } else {
      placementY = 'below';
      top = Math.min(vHeight - PICKER_HEIGHT - PADDING, rect.bottom + 8);
    }
  }

  const targetLeft = align === 'right' ? rect.right - PICKER_WIDTH : rect.left;
  const left = Math.max(PADDING, Math.min(targetLeft, vWidth - PICKER_WIDTH - PADDING));

  const triggerCenterX = rect.left + rect.width / 2;
  const relX = Math.round(((triggerCenterX - left) / PICKER_WIDTH) * 100);
  const clampedX = Math.max(8, Math.min(92, relX));
  const transformOrigin = placementY === 'above' ? `${clampedX}% 100%` : `${clampedX}% 0%`;

  return { top, left, placementY, transformOrigin };
}

export interface ExpandedReactionPickerProps {
  onPick: (emoji: string, origin?: { x: number; y: number }) => void;
  onClose: () => void;
  align?: 'left' | 'right';
  anchorEl?: HTMLElement | null;
  coords?: { x: number; y: number } | null;
}

interface ReactionItemProps {
  emoji: string;
  isRecent?: boolean;
  onPick: (emoji: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ReactionItem = React.memo(function ReactionItem({
  emoji,
  isRecent = false,
  onPick,
}: ReactionItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => onPick(emoji, e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 hover:scale-125 active:scale-90 transition-transform duration-150 cursor-pointer focus:outline-none transform-gpu"
      title={`React with ${emoji}`}
    >
      <TelegramAppleEmoji
        emoji={emoji}
        size={28}
        playAnimation={isRecent || isHovered}
        className="pointer-events-none transform-gpu"
      />
    </button>
  );
});

interface QuickPillItemProps {
  emoji: string;
  onPick: (emoji: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}

const QuickPillItem = React.memo(function QuickPillItem({ emoji, onPick }: QuickPillItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={(e) => onPick(emoji, e)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 active:scale-90 transition-transform cursor-pointer transform-gpu"
      title={`React with ${emoji}`}
    >
      <TelegramAppleEmoji
        emoji={emoji}
        size={20}
        playAnimation={isHovered}
        className="pointer-events-none transform-gpu"
      />
    </button>
  );
});

export default function ExpandedReactionPicker({
  onPick,
  onClose,
  align = 'left',
  anchorEl,
  coords,
}: ExpandedReactionPickerProps) {
  const [activeTab, setActiveTab] = useState<string>('popular');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(isTestEnv);
  const [pos, setPos] = useState<PositionState>(() =>
    calculatePosition(anchorEl ?? null, align, coords),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isClosingRef = useRef<boolean>(false);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setSearchQuery('');
    const target = categoryRefs.current.get(tabId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  useEffect(() => {
    if (!isTestEnv) {
      const frame = requestAnimationFrame(() => {
        setIsOpen(true);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, []);

  const recentEmojis = useMemo(() => getStoredRecentReactions(), []);
  const recentSet = useMemo(() => new Set(recentEmojis), [recentEmojis]);

  // Update position on scroll, resize, or anchor changes
  const updatePosition = useCallback(() => {
    if (isClosingRef.current) return;
    const next = calculatePosition(anchorEl ?? null, align, coords);
    setPos((prev) => {
      if (
        prev.top === next.top &&
        prev.left === next.left &&
        prev.placementY === next.placementY &&
        prev.transformOrigin === next.transformOrigin
      ) {
        return prev;
      }
      return next;
    });
  }, [anchorEl, align, coords]);

  useEffect(() => {
    updatePosition();
    const handleScroll = (e: Event) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };

    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [updatePosition]);

  // Smooth exit transition handler
  const requestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    const delay = isTestEnv ? 0 : 180;
    if (delay === 0) {
      onClose();
    } else {
      setTimeout(() => {
        onClose();
      }, delay);
    }
  }, [onClose]);

  // Click outside to smoothly close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        requestClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [requestClose]);

  // Escape key to smoothly close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [requestClose]);

  const handlePickEmoji = (emoji: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    triggerReactionBurst(origin.x, origin.y, emoji);

    if (isTestEnv) {
      onPick(emoji, origin);
      onClose();
    } else {
      isClosingRef.current = true;
      setIsClosing(true);
      setTimeout(() => {
        onPick(emoji, origin);
        onClose();
      }, 180);
    }
  };

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return EXPANDED_REACTIONS.map((cat) => {
      let sourceList: string[];
      if (cat.id === 'recent') {
        sourceList = recentEmojis;
      } else {
        sourceList = cat.emojis.filter((e) => !recentSet.has(e));
      }

      if (!query) return { ...cat, emojis: sourceList };

      const filtered = sourceList.filter((e) => e.includes(query));
      return { ...cat, emojis: filtered };
    }).filter((cat) => cat.emojis.length > 0);
  }, [searchQuery, recentEmojis, recentSet]);

  const isPortaled = Boolean(anchorEl && typeof document !== 'undefined');

  const pickerNode = (
    <div
      ref={containerRef}
      role="dialog"
      aria-label="Reactions Menu"
      style={
        isPortaled
          ? {
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: PICKER_WIDTH,
              maxHeight: `min(${PICKER_HEIGHT}px, calc(100vh - 24px))`,
              zIndex: 99999,
              transformOrigin: pos.transformOrigin,
              transform: isClosing
                ? `scale(0.88) translateY(${pos.placementY === 'above' ? '6px' : '-6px'}) translateZ(0)`
                : isOpen
                  ? 'scale(1) translateY(0) translateZ(0)'
                  : `scale(0.86) translateY(${pos.placementY === 'above' ? '8px' : '-8px'}) translateZ(0)`,
              opacity: isClosing ? 0 : isOpen ? 1 : 0,
              transition: isClosing
                ? 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease-in'
                : 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms cubic-bezier(0.16, 1, 0.3, 1)',
              pointerEvents: isClosing || !isOpen ? 'none' : 'auto',
              contain: 'paint layout',
              willChange: isClosing ? 'transform, opacity' : 'auto',
            }
          : undefined
      }
      className={`${
        isPortaled
          ? ''
          : `absolute bottom-full mb-2 z-50 ${align === 'right' ? 'right-0' : 'left-0'} `
      }w-86.25 max-h-115 flex flex-col bg-[#161522] border border-white/12 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden select-none isolate ${
        !isPortaled
          ? isClosing
            ? 'opacity-0 scale-90 transition-all duration-150'
            : 'animate-popIn'
          : ''
      }`}
    >
      {/* Top Category Tabs Bar */}
      <div className="flex items-center gap-1 px-3 pt-2.5 pb-2 border-b border-white/8 overflow-x-auto custom-scrollbar">
        {EXPANDED_REACTIONS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id)}
              className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title={tab.name}
            >
              {tab.icon}
            </button>
          );
        })}
      </div>

      {/* Search Input & Quick Filter Pills */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/6 bg-black/20">
        <div className="relative flex-1 flex items-center">
          <Search size={14} className="absolute left-2.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search emoji..."
            className="w-full bg-white/[0.07] border border-white/10 rounded-xl pl-8 pr-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/60 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1">
          {['❤️', '👍', '👎', '🎉'].map((quickEmoji) => (
            <QuickPillItem key={quickEmoji} emoji={quickEmoji} onPick={handlePickEmoji} />
          ))}
        </div>
      </div>

      {/* Scrollable Emojis List Grid */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4 max-h-82.5 overscroll-contain"
      >
        {filteredCategories.length > 0 ? (
          filteredCategories.map((cat) => (
            <div
              key={cat.id}
              ref={(el) => {
                if (el) categoryRefs.current.set(cat.id, el);
                else categoryRefs.current.delete(cat.id);
              }}
              style={{
                contentVisibility: 'auto',
                containIntrinsicSize: '0 160px',
              }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
                {cat.name}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cat.emojis.map((emoji, idx) => (
                  <ReactionItem
                    key={`${cat.id}-${emoji}-${idx}`}
                    emoji={emoji}
                    isRecent={cat.id === 'recent'}
                    onPick={handlePickEmoji}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-xs text-gray-500">
            No emojis found for &quot;{searchQuery}&quot;
          </div>
        )}
      </div>
    </div>
  );

  if (isPortaled) {
    return createPortal(pickerNode, document.body);
  }

  return pickerNode;
}
