import React, { useState } from 'react';
import { X, Search, Calendar as CalendarIcon } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import { useMessageSearch } from '../model/useMessageSearch';
import { highlightMatches } from '@/shared/lib/highlightMatches';
import { formatMessageTime } from '../lib/groupMessagesByDate';

import type { MessageView } from '../../../entities/chat/model/types';

interface MessageSearchPanelProps {
  conversationId: string;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
  onOpenDatePicker?: (anchorRect?: DOMRect) => void;
}

export default function MessageSearchPanel({
  conversationId,
  onClose,
  onJumpToMessage,
  onOpenDatePicker,
}: MessageSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const { results, isSearching, isTyping } = useMessageSearch(conversationId, query);
  const isLoading = isSearching || isTyping;
  const trimmed = query.trim();

  const requestClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(onClose, 180);
  };

  return (
    <div
      className={`h-full w-[340px] flex-shrink-0 flex flex-col bg-[#16161a]/80 backdrop-blur-2xl border-l border-white/5 ${
        isClosing ? 'animate-slideOutRight' : 'animate-slideInRight'
      }`}
    >
      <div className="flex items-center justify-between px-5 h-16 flex-shrink-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={requestClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
          >
            <X size={18} />
          </button>
          <h2 className="text-base font-bold text-white">Search</h2>
        </div>

        {onOpenDatePicker && (
          <button
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              onOpenDatePicker(rect);
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-400 hover:bg-white/10 transition-colors"
            title="Jump to date"
          >
            <CalendarIcon size={17} />
          </button>
        )}
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in chat..."
              className="w-full h-10 pl-10 pr-24 rounded-full bg-white/5 border border-white/5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 transition-colors"
            />
            {trimmed && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {isLoading ? '…' : `${results.length} result${results.length === 1 ? '' : 's'}`}
                </span>
                <button
                  onClick={() => setQuery('')}
                  className="w-5 h-5 flex items-center justify-center rounded-full text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
        {!trimmed && (
          <p className="text-center text-sm text-gray-500 mt-10 px-4">
            Type to search messages in this chat
          </p>
        )}

        {trimmed && !isLoading && results.length === 0 && (
          <p className="text-center text-sm text-gray-500 mt-10 px-4">No messages found</p>
        )}

        <div className="flex flex-col gap-0.5">
          {results.map((message: MessageView, index: number) => (
            <button
              key={message.id}
              onClick={() => onJumpToMessage(message.id)}
              style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
              className="animate-fadeIn flex items-start gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/5 transition-colors"
            >
              <Avatar size="sm" src={message.sender.avatar} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white truncate">
                    {message.sender.displayName ?? message.sender.username}
                  </span>
                  <span className="text-[11px] text-gray-500 flex-shrink-0">
                    {formatMessageTime(message.createdAt)}
                  </span>
                </div>
                <p className="text-[13px] text-gray-400 truncate">
                  {message.body ? highlightMatches(message.body, trimmed) : 'Sent an attachment'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
