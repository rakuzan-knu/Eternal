import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Search, Calendar as CalendarIcon, ChevronDown, Check } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import GroupAvatarCollage from '@/shared/ui/GroupAvatarCollage';
import { TelegramAppleEmoji } from './Call/TelegramAppleEmoji';
import { useMessageSearch } from '../model/useMessageSearch';
import { useConversations } from '../model/useConversations';
import { getConversationDisplay, getMessagePreview } from '../lib/getConversationDisplay';
import { useAuthStore } from '@/shared/model/useAuthStore';
import { highlightMatches } from '@/shared/lib/highlightMatches';
import { formatMessageTime } from '../lib/groupMessagesByDate';
import type { MessageView, ConversationView } from '../../../entities/chat/model/types';

interface MessageSearchPanelProps {
  conversationId: string;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
  onOpenDatePicker?: (anchorRect?: DOMRect) => void;
  onSelectConversation?: (conversationId: string) => void;
}

export default function MessageSearchPanel({
  conversationId,
  onClose,
  onJumpToMessage,
  onOpenDatePicker,
  onSelectConversation,
}: MessageSearchPanelProps) {
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.userId);
  const { data: conversations } = useConversations();

  const [query, setQuery] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState<string>(conversationId);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [isMenuClosing, setIsMenuClosing] = useState(false);
  const [chatFilterQuery, setChatFilterQuery] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Update selected conversation if prop changes
  useEffect(() => {
    setSelectedConversationId(conversationId);
  }, [conversationId]);

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search messages in selected conversation
  const { results, isSearching, isTyping } = useMessageSearch(selectedConversationId, query);
  const isLoading = isSearching || isTyping;
  const trimmed = query.trim();

  // Close animation handler for the entire panel
  const requestClose = () => {
    onClose();
  };

  // Close animation handler for the chat selector dropdown (flies smoothly back into button)
  const closeChatMenu = () => {
    if (!isChatMenuOpen || isMenuClosing) return;
    setIsMenuClosing(true);
    setTimeout(() => {
      setIsChatMenuOpen(false);
      setIsMenuClosing(false);
    }, 190);
  };

  const toggleChatMenu = () => {
    if (isChatMenuOpen) {
      closeChatMenu();
    } else {
      setIsChatMenuOpen(true);
      setChatFilterQuery('');
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!isChatMenuOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerBtnRef.current &&
        !triggerBtnRef.current.contains(target)
      ) {
        closeChatMenu();
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isChatMenuOpen, isMenuClosing]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (isChatMenuOpen) {
          closeChatMenu();
        } else if (query) {
          setQuery('');
        } else {
          requestClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isChatMenuOpen, isMenuClosing, query]);

  // Active selected conversation view
  const selectedConv = useMemo(() => {
    return conversations?.find((c: ConversationView) => c.id === selectedConversationId) ?? null;
  }, [conversations, selectedConversationId]);

  // Current conversation display for badge
  const selectedDisplay = useMemo(() => {
    if (!selectedConv) {
      return { title: 'This Chat', avatar: null, isGroup: false };
    }
    const d = getConversationDisplay(selectedConv, currentUserId);
    return {
      title: selectedConv.id === conversationId ? 'This Chat' : d.title,
      avatar: d.avatar,
      isGroup: d.isGroup,
    };
  }, [selectedConv, conversationId, currentUserId]);

  // Filtered conversations for dropdown
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    if (!chatFilterQuery.trim()) return conversations;
    const q = chatFilterQuery.toLowerCase();
    return conversations.filter((c: ConversationView) => {
      const d = getConversationDisplay(c, currentUserId);
      return d.title.toLowerCase().includes(q);
    });
  }, [conversations, chatFilterQuery, currentUserId]);

  const handleMessageClick = (messageId: string) => {
    if (selectedConversationId !== conversationId) {
      if (onSelectConversation) {
        onSelectConversation(selectedConversationId);
      } else {
        navigate(`/messages/${selectedConversationId}?messageId=${messageId}`);
      }
      onClose();
    } else {
      onJumpToMessage(messageId);
    }
  };

  return (
    <div className="h-full w-[340px] flex-shrink-0 flex flex-col glass-panel border-l border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-16 flex-shrink-0 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            onClick={requestClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors active:scale-90 cursor-pointer"
            title="Close search"
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
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-400 hover:bg-white/10 transition-colors cursor-pointer"
            title="Jump to date"
          >
            <CalendarIcon size={17} />
          </button>
        )}
      </div>

      {/* Search Input Box */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              ref={inputRef}
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
                  className="w-5 h-5 flex items-center justify-center rounded-full text-gray-500 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* "Search messages in" Chat Selector Row */}
      <div className="relative px-4 pb-2 z-20">
        <div className="flex items-center justify-between text-[11px] font-medium text-gray-400 mb-1 px-1">
          <span>Search messages in</span>
        </div>

        {/* Trigger Button */}
        <div className="relative">
          <button
            ref={triggerBtnRef}
            type="button"
            onClick={toggleChatMenu}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
              isChatMenuOpen && !isMenuClosing
                ? 'glass-card border-black/15 dark:border-white/20 shadow-sm'
                : 'glass-card border-black/8 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {selectedDisplay.isGroup ? (
                selectedDisplay.avatar ? (
                  <Avatar size="xs" src={selectedDisplay.avatar} />
                ) : (
                  <GroupAvatarCollage
                    avatars={selectedConv?.participants.map((p) => p.user?.avatar) || []}
                    size={24}
                  />
                )
              ) : (
                <Avatar size="xs" src={selectedDisplay.avatar} />
              )}
              <span className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[170px]">
                {selectedDisplay.title}
              </span>
              <ChevronDown
                size={14}
                className={`text-gray-500 dark:text-gray-400 transition-transform duration-250 ease-out shrink-0 ${
                  isChatMenuOpen && !isMenuClosing
                    ? 'rotate-180 text-gray-900 dark:text-white'
                    : 'rotate-0'
                }`}
              />
            </div>

            {selectedConversationId !== conversationId && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedConversationId(conversationId);
                  closeChatMenu();
                }}
                title="Reset to this chat"
                className="w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/15 transition-colors cursor-pointer"
              >
                <X size={12} />
              </div>
            )}
          </button>

          {/* Smooth Dropdown / Popover Menu */}
          {isChatMenuOpen && (
            <div
              ref={menuRef}
              className={`absolute left-0 right-0 top-full mt-1.5 z-40 p-1.5 rounded-2xl glass-menu shadow-[0_16px_50px_rgba(0,0,0,0.5)] origin-top transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col gap-1 ${
                isMenuClosing
                  ? 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  : 'opacity-100 scale-100 translate-y-0 animate-in fade-in zoom-in-95'
              }`}
            >
              {/* Optional Search in chats */}
              {(conversations?.length ?? 0) > 5 && (
                <div className="px-2 pt-1 pb-1">
                  <input
                    type="text"
                    value={chatFilterQuery}
                    onChange={(e) => setChatFilterQuery(e.target.value)}
                    placeholder="Filter chats..."
                    className="w-full h-7 px-2.5 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/5 text-xs text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-primary-500/40 transition-colors"
                  />
                </div>
              )}

              {/* Scrollable Chat List */}
              <div className="max-h-60 overflow-y-auto scrollbar-none space-y-0.5 custom-scrollbar pr-0.5">
                {/* 1. "This Chat" option */}
                {conversations?.some((c: ConversationView) => c.id === conversationId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedConversationId(conversationId);
                      closeChatMenu();
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      selectedConversationId === conversationId
                        ? 'bg-primary-500/15 text-primary-500 dark:text-primary-300 font-semibold'
                        : 'text-gray-800 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/6 hover:text-gray-950 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {selectedDisplay.isGroup ? (
                        selectedDisplay.avatar ? (
                          <Avatar size="xs" src={selectedDisplay.avatar} />
                        ) : (
                          <GroupAvatarCollage
                            avatars={selectedConv?.participants.map((p) => p.user?.avatar) || []}
                            size={24}
                          />
                        )
                      ) : (
                        <Avatar size="xs" src={selectedDisplay.avatar} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate text-gray-900 dark:text-white">
                          This Chat
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                          Current conversation
                        </p>
                      </div>
                    </div>
                    {selectedConversationId === conversationId && (
                      <Check
                        size={14}
                        className="text-primary-500 dark:text-primary-400 shrink-0"
                      />
                    )}
                  </button>
                )}

                <div className="h-px bg-black/8 dark:bg-white/5 my-1" />

                {/* 2. Other Chats */}
                {filteredConversations.map((conv: ConversationView) => {
                  const d = getConversationDisplay(conv, currentUserId);
                  const isSelected = selectedConversationId === conv.id;

                  return (
                    <button
                      key={conv.id}
                      type="button"
                      onClick={() => {
                        setSelectedConversationId(conv.id);
                        closeChatMenu();
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 p-2 rounded-xl text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-primary-500/15 text-primary-500 dark:text-primary-300 font-semibold'
                          : 'text-gray-800 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/6 hover:text-gray-950 dark:hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {d.isGroup ? (
                          d.avatar ? (
                            <Avatar size="xs" src={d.avatar} />
                          ) : (
                            <GroupAvatarCollage
                              avatars={conv.participants.map((p) => p.user?.avatar)}
                              size={24}
                            />
                          )
                        ) : (
                          <Avatar size="xs" src={d.avatar} />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                            {d.title}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                            {getMessagePreview(conv, currentUserId)}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <Check
                          size={14}
                          className="text-primary-500 dark:text-primary-400 shrink-0"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
        {/* State A: Empty search input -> Telegram style animated magnifying glass emoji */}
        {!trimmed && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center py-20 px-4 text-center select-none animate-fadeIn">
            <div className="relative mb-4 flex items-center justify-center">
              <TelegramAppleEmoji emoji="🔍" size={80} playAnimation={true} />
            </div>
            <p className="text-sm font-medium text-gray-400">Search for messages</p>
          </div>
        )}

        {/* State B: Loading state -> Telegram style skeleton shimmer rows */}
        {isLoading && (
          <div className="space-y-3 px-2 py-2 animate-fadeIn">
            <p className="text-xs text-gray-400 font-medium px-2 mb-1">Loading...</p>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{ animationDelay: `${i * 35}ms` }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-fadeIn"
              >
                <div
                  className="w-10 h-10 rounded-full skeleton-shimmer shrink-0"
                  style={{ animationDelay: `${i * 90}ms` }}
                />
                <div className="flex-1 space-y-2 min-w-0">
                  <div
                    className="h-3 rounded-full skeleton-shimmer"
                    style={{
                      width: `${35 + ((i * 13) % 25)}%`,
                      animationDelay: `${i * 90 + 35}ms`,
                    }}
                  />
                  <div
                    className="h-2.5 rounded-full skeleton-shimmer"
                    style={{
                      width: `${55 + ((i * 19) % 35)}%`,
                      animationDelay: `${i * 90 + 70}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* State C: Search completed, 0 messages found -> Telegram Style Duck with No Results */}
        {trimmed && !isLoading && results.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center py-16 px-6 text-center select-none animate-fadeIn">
            <div className="relative mb-4 flex items-center justify-center">
              <TelegramAppleEmoji emoji="🦆" size={88} playAnimation={true} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">No Results</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[240px] leading-relaxed">
              There were no results for &ldquo;{trimmed}&rdquo;.
            </p>
          </div>
        )}

        {/* State D: Search completed with results */}
        {trimmed && !isLoading && results.length > 0 && (
          <div className="px-1 pb-4 animate-fadeIn">
            <p className="text-xs text-gray-400 font-medium px-2 mb-2">
              {results.length} message{results.length === 1 ? '' : 's'} found
            </p>

            <div className="flex flex-col gap-0.5">
              {results.map((message: MessageView, index: number) => (
                <button
                  key={message.id}
                  onClick={() => handleMessageClick(message.id)}
                  style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
                  className="animate-fadeIn flex items-start gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-white/5 active:bg-white/10 transition-colors group cursor-pointer"
                >
                  <Avatar
                    size="sm"
                    src={message.sender.avatar}
                    decoration={message.sender.activeDecoration}
                    userId={message.sender.id}
                    className="mt-0.5 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                        {message.sender.displayName ?? message.sender.username}
                      </span>
                      <span className="text-[11px] text-gray-500 shrink-0">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-300 line-clamp-2 mt-0.5 leading-relaxed">
                      {message.body
                        ? highlightMatches(message.body, trimmed)
                        : 'Sent an attachment'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
