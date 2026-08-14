import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Hash } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { apiClient as api } from '@/shared/api/httpClient';

interface UserOption {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isVerified?: boolean;
  primaryBadge?: string | null;
  followersCount?: number;
}

interface HashtagOption {
  tag: string;
  count: number;
}

function formatCount(num?: number): string {
  if (!num) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`.replace('.0M', 'M');
  if (num >= 10_000) return `${(num / 1_000).toFixed(1)}K`.replace('.0K', 'K');
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}

interface MentionAutocompleteProps {
  text: string;
  cursorPos: number;
  onSelect: (newText: string, newPos: number) => void;
  onClose?: () => void;
}

function MentionAutocompletePopup({
  triggerType,
  queryTerm,
  tokenStartIndex,
  text,
  cursorPos,
  onSelect,
  onClose,
}: {
  triggerType: string;
  queryTerm: string;
  tokenStartIndex: number;
  text: string;
  cursorPos: number;
  onSelect: (newText: string, newPos: number) => void;
  onClose?: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Smart search prioritized by mutuals, following and chats
  const { data: users = [] } = useQuery<UserOption[]>({
    queryKey: ['mentionSearchUsers', queryTerm],
    queryFn: async () => {
      const res = await api.get<UserOption[]>('/users/mention-suggestions', {
        params: { q: queryTerm },
      });
      return Array.isArray(res.data) ? res.data.slice(0, 6) : [];
    },
    enabled: triggerType === '@',
  });

  // Search hashtags with post counters
  const { data: hashtags = [] } = useQuery<HashtagOption[]>({
    queryKey: ['mentionSearchHashtags', queryTerm],
    queryFn: async () => {
      const res = await api.get<HashtagOption[]>('/users/hashtags', { params: { q: queryTerm } });
      return Array.isArray(res.data) ? res.data.slice(0, 6) : [];
    },
    enabled: triggerType === '#',
  });

  const items = triggerType === '@' ? users : hashtags;

  const handleSelectItem = useCallback(
    (item: UserOption | HashtagOption) => {
      if (tokenStartIndex < 0) return;

      const insertText = 'username' in item ? `@${item.username} ` : `#${item.tag} `;
      const textAfterCursor = text.slice(cursorPos);
      const wordTailMatch = textAfterCursor.match(/^[a-zA-Z0-9._]*/);
      const wordTailLength = wordTailMatch ? wordTailMatch[0].length : 0;

      const before = text.slice(0, tokenStartIndex);
      const after = text.slice(cursorPos + wordTailLength);
      const newText = before + insertText + after;
      const newPos = before.length + insertText.length;

      onSelect(newText, newPos);
    },
    [cursorPos, onSelect, text, tokenStartIndex],
  );

  const [prevTerm, setPrevTerm] = useState({ queryTerm, triggerType });
  if (prevTerm.queryTerm !== queryTerm || prevTerm.triggerType !== triggerType) {
    setPrevTerm({ queryTerm, triggerType });
    setSelectedIndex(0);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % items.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (items[selectedIndex]) {
          e.preventDefault();
          handleSelectItem(items[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleSelectItem, items, onClose, selectedIndex]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      role="listbox"
      aria-label={triggerType === '@' ? 'User mention suggestions' : 'Hashtag suggestions'}
      className="absolute z-50 bottom-full left-0 mb-2 w-full max-w-sm bg-[#121215]/95 backdrop-blur-2xl border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-fadeIn py-1 max-h-64 overflow-y-auto custom-scrollbar"
    >
      {triggerType === '@'
        ? (items as UserOption[]).map((user, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => handleSelectItem(user)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <Avatar src={user.avatar} size="sm" />
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-semibold text-xs text-white truncate">
                      {user.displayName || user.username}
                    </span>
                    {user.isVerified && (
                      <CheckCircle2 size={13} className="text-sky-400 fill-sky-400/20 shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 truncate">@{user.username}</span>
                </div>
              </button>
            );
          })
        : (items as HashtagOption[]).map((hash, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={hash.tag}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => handleSelectItem(hash)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                  isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-sky-400">
                  <Hash size={16} />
                </div>
                <div className="flex items-center justify-between min-w-0 flex-1 gap-2">
                  <span className="font-semibold text-xs text-white truncate">#{hash.tag}</span>
                  <span className="text-[11px] text-gray-400 font-medium shrink-0">
                    {formatCount(hash.count)} posts
                  </span>
                </div>
              </button>
            );
          })}
    </div>
  );
}

export function MentionAutocomplete({
  text,
  cursorPos,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const textBeforeCursor = text.slice(0, cursorPos);
  const match = textBeforeCursor.match(/(?:^|\s)([@#][a-zA-Z0-9._]*)$/);

  if (!match) return null;

  const fullMatchedToken = match[1];
  const triggerType = fullMatchedToken[0];
  const queryTerm = fullMatchedToken.slice(1);
  const tokenStartIndex = cursorPos - fullMatchedToken.length;

  return (
    <MentionAutocompletePopup
      triggerType={triggerType}
      queryTerm={queryTerm}
      tokenStartIndex={tokenStartIndex}
      text={text}
      cursorPos={cursorPos}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
}
