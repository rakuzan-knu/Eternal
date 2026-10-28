import { Nameplate } from '@/shared/ui/Nameplate';
import React, { useId, useRef, useState } from 'react';
import { X, Check, Search } from 'lucide-react';
import Avatar from '../../../shared/ui/Avatar';
import Modal from '../../../shared/ui/Modal';
import { useUserSearch } from '../model/useUserSearch';
import { UserSearchResult } from '../api/userSearchApi';
import { useAddMembers } from '../model/useConversationMutations';

interface AddMembersModalProps {
  conversationId: string;
  existingMemberIds: string[];
  onClose: () => void;
}

const MAX_MEMBERS_PER_REQUEST = 100;

export default function AddMembersModal({
  conversationId,
  existingMemberIds,
  onClose,
}: AddMembersModalProps) {
  const titleId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const { results, isSearching, isError, retry } = useUserSearch(query);
  const addMembers = useAddMembers();

  const filteredResults = results.filter(
    (u: UserSearchResult) => !existingMemberIds.includes(u.id),
  );

  const toggleUser = (user: UserSearchResult) => {
    setSelected((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : prev.length < MAX_MEMBERS_PER_REQUEST
          ? [...prev, user]
          : prev,
    );
  };

  const isSelected = (id: string) => selected.some((u) => u.id === id);

  return (
    <Modal
      onClose={onClose}
      closeOnInputEscape
      aria-labelledby={titleId}
      className="w-full max-w-md max-h-[75vh] flex flex-col"
    >
      {(close) => {
        const handleAdd = () => {
          if (selected.length === 0) return;
          addMembers.mutate(
            { conversationId, memberIds: selected.map((u) => u.id) },
            { onSuccess: close },
          );
        };

        return (
          <div className="glass-modal border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[75vh]">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
              <div>
                <h2 id={titleId} className="text-lg font-bold text-white">
                  Add members
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  {selected.length}/{MAX_MEMBERS_PER_REQUEST} selected · Add up to 100 people at a
                  time
                </p>
              </div>
              <button
                type="button"
                aria-label="Close add members"
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
                    className="nameplate-row animate-popIn flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-white/10 hover:bg-white/15 transition-colors overflow-hidden"
                  >
                    <Nameplate nameplate={user.activeNameplate} alwaysPlay={true} />
                    <Avatar
                      size="sm"
                      src={user.avatar}
                      decoration={user.activeDecoration}
                      userId={user.id}
                    />
                    <span data-nameplate-text className="text-xs font-medium text-white truncate">
                      {user.displayName ?? user.username}
                    </span>
                    <X size={11} className="text-gray-400 relative z-10" />
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
                  ref={searchRef}
                  autoFocus
                  aria-label="Search by username"
                  value={query}
                  maxLength={32}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by username"
                  className="w-full h-10 pl-10 pr-12 rounded-full bg-white/5 border border-white/5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20 transition-colors"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear people search"
                    onClick={() => {
                      setQuery('');
                      searchRef.current?.focus();
                    }}
                    className="absolute right-1 top-0 h-10 w-10 flex items-center justify-center rounded-full text-gray-400 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
              {isSearching && (
                <p role="status" className="text-center text-sm text-gray-400 py-4">
                  Searching people…
                </p>
              )}
              {!query.trim() && (
                <p className="text-center text-sm text-gray-500 mt-8 px-6">
                  Search for people to add to this group
                </p>
              )}
              {isError && (
                <div role="alert" className="text-center text-sm text-red-400 mt-8 px-6">
                  People could not be loaded.{' '}
                  <button
                    type="button"
                    className="underline cursor-pointer"
                    onClick={() => void retry()}
                  >
                    Try again
                  </button>
                </div>
              )}
              {query.trim() && !isSearching && !isError && filteredResults.length === 0 && (
                <p className="text-center text-sm text-gray-500 mt-8 px-6">No users found</p>
              )}

              {filteredResults.map((user: UserSearchResult) => {
                const selectedState = isSelected(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    aria-pressed={selectedState}
                    disabled={!selectedState && selected.length >= MAX_MEMBERS_PER_REQUEST}
                    onClick={() => toggleUser(user)}
                    className={`nameplate-row w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.99] ${
                      selectedState ? 'bg-white/10' : 'hover:bg-white/5'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <Nameplate nameplate={user.activeNameplate} alwaysPlay={true} />
                    <Avatar
                      size="sm"
                      src={user.avatar}
                      decoration={user.activeDecoration}
                      userId={user.id}
                    />
                    <span data-nameplate-text className="flex-1 text-left min-w-0">
                      <span
                        data-nameplate-label
                        className="block text-sm font-semibold text-white truncate"
                      >
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
              {addMembers.isError && (
                <p role="alert" className="text-sm text-red-400 mb-3">
                  Could not add members. Your selection is kept. Try again.
                </p>
              )}
              <button
                type="button"
                aria-busy={addMembers.isPending}
                disabled={selected.length === 0 || addMembers.isPending}
                onClick={handleAdd}
                className="w-full py-2.5 rounded-full text-sm font-semibold bg-blue-500 hover:bg-blue-400 disabled:bg-white/10 disabled:text-gray-500 text-white transition-all active:scale-[0.98]"
              >
                {addMembers.isPending
                  ? 'Adding…'
                  : `Add${selected.length > 0 ? ` (${selected.length})` : ''}`}
              </button>
            </div>
          </div>
        );
      }}
    </Modal>
  );
}
