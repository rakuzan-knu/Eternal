import React, { useEffect, useRef, useState, useTransition } from 'react';
import {
  Search,
  X,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Link2,
  Users,
  ChevronRight,
} from 'lucide-react';
import Modal from '@/shared/ui/Modal';
import Avatar from '@/shared/ui/Avatar';
import OnlineStatusIndicator from '@/shared/ui/OnlineStatusIndicator';
import { chatApi } from '../api/chatApi';
import type { GlobalSearchResult } from '../../../entities/chat/model/types';
import { formatMessageTime } from '../lib/groupMessagesByDate';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (conversationId: string, messageId?: string) => void;
  onStartDirectChat?: (userId: string) => void;
  initialConversationId?: string;
}

type SearchTab = 'all' | 'messages' | 'media' | 'files' | 'links' | 'people';

export default function GlobalSearchModal({
  isOpen,
  onClose,
  onSelectConversation,
  onStartDirectChat,
  initialConversationId,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SearchTab>('all');
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      chatApi
        .globalSearch(trimmed, tab === 'all' ? 'all' : tab, initialConversationId, 30, 0)
        .then((res) => {
          startTransition(() => {
            setResults(res);
            setIsLoading(false);
          });
        })
        .catch(() => {
          setIsLoading(false);
        });
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [query, tab, isOpen, initialConversationId]);

  if (!isOpen) return null;

  const totalResults =
    (results?.messages.length ?? 0) + (results?.media.length ?? 0) + (results?.people.length ?? 0);

  return (
    <Modal onClose={onClose} className="w-[min(780px,94vw)] max-h-[85vh] rounded-3xl p-0">
      {() => (
        <div className="flex flex-col h-full max-h-[85vh] bg-[#111114]/95 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-3xl shadow-2xl">
          {/* Header Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-white/2">
            <Search size={20} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search messages, photos, files, links, and people..."
              className="flex-1 bg-transparent text-white placeholder:text-gray-500 text-base focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[11px] font-semibold text-gray-400 bg-white/5 border border-white/10 rounded-md">
              ESC
            </kbd>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 bg-white/1 overflow-x-auto custom-scrollbar">
            {(
              [
                { id: 'all', label: 'All', icon: Search },
                { id: 'messages', label: 'Messages', icon: MessageSquare },
                { id: 'media', label: 'Media', icon: ImageIcon },
                { id: 'files', label: 'Files', icon: FileText },
                { id: 'links', label: 'Links', icon: Link2 },
                { id: 'people', label: 'People', icon: Users },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <Icon size={13} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Results Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <div className="h-6 w-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin mr-2" />
                <span className="text-sm">Searching...</span>
              </div>
            )}

            {!isLoading && query && totalResults === 0 && (
              <div className="text-center py-16 text-gray-500 space-y-2">
                <Search size={36} className="mx-auto opacity-40" />
                <p className="text-sm font-medium">No results found for "{query}"</p>
                <p className="text-xs text-gray-600">Try searching for other keywords or users</p>
              </div>
            )}

            {!isLoading && !query && (
              <div className="text-center py-16 text-gray-500 space-y-2">
                <Search size={36} className="mx-auto opacity-30 text-gray-400" />
                <p className="text-sm font-medium text-gray-400">Instant Global Search</p>
                <p className="text-xs text-gray-500">
                  Search across all your conversation history, media files, and contacts.
                </p>
              </div>
            )}

            {!isLoading && results && totalResults > 0 && (
              <>
                {/* People Results */}
                {(tab === 'all' || tab === 'people') && results.people.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                      People & Contacts
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {results.people.map((person) => (
                        <div
                          key={person.id}
                          onClick={() => {
                            if (onStartDirectChat) {
                              onStartDirectChat(person.id);
                            }
                            onClose();
                          }}
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-white/3 hover:bg-white/8 transition-colors cursor-pointer group border border-white/5"
                        >
                          <div className="relative shrink-0">
                            <Avatar src={person.avatar} size="md" />
                            {person.isOnline && (
                              <OnlineStatusIndicator userId={person.id} variant="dot" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white truncate">
                              {person.displayName || person.username}
                            </p>
                            <p className="text-xs text-gray-500 truncate">@{person.username}</p>
                          </div>
                          <button
                            type="button"
                            title="Chat"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-primary-500 transition-colors"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages Results */}
                {(tab === 'all' || tab === 'messages') && results.messages.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                      Messages ({results.messages.length})
                    </h3>
                    <div className="space-y-1.5">
                      {results.messages.map((msg) => (
                        <div
                          key={msg.id}
                          onClick={() => {
                            onSelectConversation(msg.conversationId, msg.id);
                            onClose();
                          }}
                          className="flex items-start gap-3 p-3 rounded-2xl bg-white/2 hover:bg-white/6 transition-colors cursor-pointer border border-white/5 group"
                        >
                          <Avatar
                            src={msg.conversationAvatar || msg.senderAvatar}
                            size="md"
                            className="shrink-0 mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-gray-200 truncate">
                                {msg.conversationTitle}
                              </span>
                              <span className="text-[11px] text-gray-500 shrink-0">
                                {formatMessageTime(msg.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-primary-400 font-medium truncate mt-0.5">
                              {msg.senderName}:
                            </p>
                            <p className="text-sm text-gray-300 mt-0.5 line-clamp-2 leading-relaxed">
                              {msg.highlightSnippet || msg.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Media Results */}
                {(tab === 'all' || tab === 'media') && results.media.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
                      Media ({results.media.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {results.media.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            onSelectConversation(item.conversationId, item.messageId);
                            onClose();
                          }}
                          className="relative group aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10 cursor-pointer"
                        >
                          <img
                            src={item.url}
                            alt={item.fileName || 'Shared media'}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              // Fallback for non-image or broken links
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <p className="text-[11px] text-white truncate">
                              {item.fileName || 'Media'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
