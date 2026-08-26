import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Clock, Zap, Smile, PartyPopper, Utensils } from 'lucide-react';
import { triggerReactionBurst } from '../lib/reactionBurstEngine';
import { getStoredRecentReactions } from '../model/useRecentReactions';

export const EXPANDED_REACTIONS: {
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
      '🍾',
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
      '✨',
    ],
  },
  {
    id: 'celebrate',
    name: 'Celebration',
    icon: <PartyPopper size={16} />,
    emojis: ['🎉', '🍾', '🏆', '⭐', '🌟', '💯', '✨', '🥳', '🎁', '🎂', '🎊', '🎈', '🎆', '🎇'],
  },
  {
    id: 'food',
    name: 'Food & Objects',
    icon: <Utensils size={16} />,
    emojis: ['🌭', '🍌', '🍓', '🍾', '🍕', '🍔', '🍦', '🍩', '🍪', '☕', '🍺', '🥑', '🍿', '🍣'],
  },
];

interface ExpandedReactionPickerProps {
  onPick: (emoji: string, origin?: { x: number; y: number }) => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

export default function ExpandedReactionPicker({
  onPick,
  onClose,
  align = 'left',
}: ExpandedReactionPickerProps) {
  const [activeTab, setActiveTab] = useState<string>('popular');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const recentEmojis = useMemo(() => getStoredRecentReactions(), []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handlePickEmoji = (emoji: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    triggerReactionBurst(origin.x, origin.y, emoji);
    onPick(emoji, origin);
    onClose();
  };

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return EXPANDED_REACTIONS.map((cat) => {
      const sourceList = cat.id === 'recent' ? recentEmojis : cat.emojis;
      if (!query) return { ...cat, emojis: sourceList };

      const filtered = sourceList.filter((e) => e.includes(query));
      return { ...cat, emojis: filtered };
    }).filter((cat) => cat.emojis.length > 0);
  }, [searchQuery, recentEmojis]);

  return (
    <div
      ref={containerRef}
      className={`absolute bottom-full mb-2 z-50 ${
        align === 'right' ? 'right-0' : 'left-0'
      } w-[345px] max-h-[460px] flex flex-col bg-[#161522]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-popIn select-none`}
    >
      {/* Top Category Tabs Bar */}
      <div className="flex items-center gap-1 px-3 pt-2.5 pb-2 border-b border-white/[0.08] overflow-x-auto custom-scrollbar">
        {EXPANDED_REACTIONS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSearchQuery('');
              }}
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
      <div className="px-3 py-2 flex items-center gap-2 border-b border-white/[0.06] bg-black/20">
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
            <button
              key={quickEmoji}
              type="button"
              onClick={(e) => handlePickEmoji(quickEmoji, e)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-sm active:scale-90 transition-transform cursor-pointer"
              title={`React with ${quickEmoji}`}
            >
              {quickEmoji}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Emojis List Grid */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4 max-h-[330px]"
      >
        {filteredCategories.length > 0 ? (
          filteredCategories.map((cat) => (
            <div key={cat.id}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">
                {cat.name}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cat.emojis.map((emoji, idx) => (
                  <button
                    key={`${cat.id}-${emoji}-${idx}`}
                    type="button"
                    onClick={(e) => handlePickEmoji(emoji, e)}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-2xl leading-none hover:bg-white/10 hover:scale-125 active:scale-90 transition-transform duration-150 cursor-pointer focus:outline-none"
                    title={`React with ${emoji}`}
                  >
                    <span className="drop-shadow-sm pointer-events-none">{emoji}</span>
                  </button>
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
}
