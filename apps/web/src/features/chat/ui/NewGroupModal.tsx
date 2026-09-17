import React, { useState } from 'react';
import { X, Check, Search } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '../../../shared/ui/Avatar';
import Modal from '../../../shared/ui/Modal';
import { useUserSearch } from '../model/useUserSearch';
import { UserSearchResult } from '../api/userSearchApi';
import { chatApi } from '../api/chatApi';
import { CONVERSATIONS_KEY } from '@/shared/api/queryKeys';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';

interface NewGroupModalProps {
  onClose: () => void;
  onCreated: (conversationId: string) => void;
}

const MAX_MEMBERS = 10;

export default function NewGroupModal({ onClose, onCreated }: NewGroupModalProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const { results, isSearching } = useUserSearch(query);
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const createGroup = useMutation({
    mutationFn: () => {
      const name = [currentUser?.username, ...selected.map((u: UserSearchResult) => u.username)]
        .filter(Boolean)
        .join(', ');
      return chatApi.createGroupConversation(
        name,
        selected.map((u: UserSearchResult) => u.id),
      );
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: [CONVERSATIONS_KEY] });
      onCreated(conversation.id);
    },
  });

  const filteredResults = results.filter((u: UserSearchResult) => u.id !== currentUser?.id);

  const toggleUser = (user: UserSearchResult) => {
    if (user.id === currentUser?.id) return;
    setSelected((prev) =>
      prev.some((u: UserSearchResult) => u.id === user.id)
        ? prev.filter((u: UserSearchResult) => u.id !== user.id)
        : [...prev, user],
    );
  };

  const isSelected = (id: string) => selected.some((u: UserSearchResult) => u.id === id);

  return (
    <Modal onClose={onClose} className="w-full max-w-md max-h-[75vh] flex flex-col">
      {(close) => (
        <div className="bg-[#1c1c20] border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[75vh]">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
            <div>
              <h2 className="text-lg font-bold text-white">New group chat</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {selected.length > 0
                  ? `${selected.length}/${MAX_MEMBERS} selected`
                  : 'You can add up to 10 people'}
              </p>
            </div>
            <button
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white transition-colors active:scale-90"
            >
              <X size={16} />
            </button>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-5 pb-3 flex-shrink-0">
              {selected.map((user) => (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user)}
                  className="animate-popIn flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-white/10 hover:bg-white/15 transition-colors"
                >
                  <Avatar size="sm" src={user.avatar} />
                  <span className="text-xs font-medium text-white">
                    {user.displayName ?? user.username}
                  </span>
                  <X size={11} className="text-gray-400" />
                </button>
              ))}
            </div>
          )}

          <div className="px-5 pb-3 flex-shrink-0">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
              />
              <input
                autoFocus
                value={query}
                maxLength={32}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by username"
                className="w-full h-10 pl-10 pr-4 rounded-full bg-white/5 border border-white/5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
            {!query.trim() && (
              <p className="text-center text-sm text-gray-500 mt-8 px-6">
                Search for people to add to the group
              </p>
            )}
            {query.trim() && !isSearching && filteredResults.length === 0 && (
              <p className="text-center text-sm text-gray-500 mt-8 px-6">No users found</p>
            )}

            {filteredResults.map((user: UserSearchResult) => {
              const selectedState = isSelected(user.id);
              const disabled = !selectedState && selected.length >= MAX_MEMBERS;
              return (
                <button
                  key={user.id}
                  disabled={disabled}
                  onClick={() => toggleUser(user)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.99] ${
                    selectedState ? 'bg-white/10' : 'hover:bg-white/5'
                  } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <Avatar size="sm" src={user.avatar} />
                  <span className="flex-1 text-left min-w-0">
                    <span className="block text-sm font-semibold text-white truncate">
                      {user.displayName ?? user.username}
                    </span>
                    <span className="block text-xs text-gray-500 truncate">@{user.username}</span>
                  </span>
                  {selectedState && (
                    <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 animate-popIn">
                      <Check size={12} className="text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-5 py-4 border-t border-white/10 flex-shrink-0">
            <button
              disabled={selected.length === 0 || createGroup.isPending}
              onClick={() => createGroup.mutate()}
              className="w-full py-2.5 rounded-full text-sm font-semibold bg-blue-500 hover:bg-blue-400 disabled:bg-white/10 disabled:text-gray-500 text-white transition-all active:scale-[0.98]"
            >
              {createGroup.isPending
                ? 'Creating…'
                : `Create group${selected.length > 0 ? ` (${selected.length + 1})` : ''}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
