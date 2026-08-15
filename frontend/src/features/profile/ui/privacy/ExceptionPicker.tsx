import { useState } from 'react';
import { Search, X, Plus, Loader2 } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { useUserSearch } from '@/features/chat/model/useUserSearch';
import type { UserSearchResult } from '@/features/chat/api/userSearchApi';
import {
  usePrivacyExceptions,
  useAddException,
  useRemoveException,
} from '../../model/usePrivacyExceptions';
import type {
  ExceptionMode,
  PrivacyDimension,
  PrivacyExceptionUser,
} from '../../model/privacyTypes';

interface ExceptionPickerProps {
  dimension: PrivacyDimension;
  mode: ExceptionMode;
}

export default function ExceptionPicker({ dimension, mode }: ExceptionPickerProps) {
  const [query, setQuery] = useState('');
  const { results, isSearching } = useUserSearch(query);

  const { data: exceptions } = usePrivacyExceptions(dimension);
  const addException = useAddException(dimension);
  const removeException = useRemoveException(dimension);

  const list: PrivacyExceptionUser[] =
    mode === 'ALLOW' ? (exceptions?.allow ?? []) : (exceptions?.deny ?? []);
  const listedIds = new Set(list.map((u: PrivacyExceptionUser) => u.id));

  const filtered = results.filter((u: UserSearchResult) => !listedIds.has(u.id));

  const add = (user: UserSearchResult) => {
    addException.mutate({ targetId: user.id, mode });
    setQuery('');
  };

  const accent = mode === 'ALLOW' ? 'text-emerald-400' : 'text-red-400';

  return (
    <div>
      {list.length > 0 && (
        <ul className="flex flex-col gap-1 mb-3">
          {list.map((u: PrivacyExceptionUser) => (
            <li
              key={u.id}
              className="flex items-center gap-3 px-3 py-2 rounded-2xl border border-white/5 bg-white/[0.03] animate-popIn"
            >
              <Avatar src={u.avatar} size="sm" alt={u.displayName ?? u.username} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {u.displayName ?? u.username}
                </p>
                <p className="text-xs text-gray-500 truncate">@{u.username}</p>
              </div>
              <button
                onClick={() => removeException.mutate(u.id)}
                disabled={removeException.isPending && removeException.variables === u.id}
                aria-label="Remove"
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-90 disabled:opacity-40"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people to add"
          className="w-full h-10 pl-10 pr-4 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/25 transition-colors"
        />
        {isSearching && (
          <Loader2
            size={15}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 animate-spin"
          />
        )}
      </div>

      {query.trim() && !isSearching && filtered.length === 0 && (
        <p className="text-center text-xs text-gray-500 mt-4">No users found</p>
      )}

      {filtered.length > 0 && (
        <ul className="flex flex-col gap-1 mt-2">
          {filtered.map((u: UserSearchResult) => (
            <li key={u.id}>
              <button
                onClick={() => add(u)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl hover:bg-white/5 transition-colors active:scale-[0.99]"
              >
                <Avatar src={u.avatar} size="sm" alt={u.displayName ?? u.username} />
                <span className="flex-1 text-left min-w-0">
                  <span className="block text-sm font-medium text-white truncate">
                    {u.displayName ?? u.username}
                  </span>
                  <span className="block text-xs text-gray-500 truncate">@{u.username}</span>
                </span>
                <span
                  className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/5 border border-white/10 ${accent}`}
                >
                  <Plus size={15} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
