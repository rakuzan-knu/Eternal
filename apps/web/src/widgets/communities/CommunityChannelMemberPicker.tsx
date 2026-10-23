import { useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useCommunityMembers } from '@/features/communities';
import { useDebounce } from '@/shared/lib/useDebounce';
import { communityButton, communityInput } from './communityStyles';

export function CommunityChannelMemberPicker({
  communityId,
  memberIds,
  onChange,
  disabled = false,
}: {
  communityId: string;
  memberIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const searchId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [composing, setComposing] = useState(false);
  const [committedSearch, setCommittedSearch] = useState('');
  const debouncedSearch = useDebounce(committedSearch.trim(), 300);
  const q = committedSearch.trim() ? debouncedSearch : '';
  const [paging, setPaging] = useState<{ q: string; cursors: (string | undefined)[] }>({
    q: '',
    cursors: [undefined],
  });
  const cursors = paging.q === q ? paging.cursors : [undefined];
  const members = useCommunityMembers(communityId, true, cursors.at(-1), q);
  const [labels, setLabels] = useState<Record<string, string>>({});
  return (
    <div className="space-y-3">
      <p className="text-sm">
        Owners and admins always have access. Choose up to 200 additional members.
      </p>
      <label htmlFor={searchId} className="block text-sm font-semibold">
        Find community members
      </label>
      <div className="flex gap-2">
        <input
          ref={searchRef}
          id={searchId}
          className={communityInput}
          value={search}
          disabled={disabled}
          maxLength={100}
          autoComplete="off"
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={(event) => {
            setComposing(false);
            setCommittedSearch(event.currentTarget.value);
          }}
          onChange={(event) => {
            setSearch(event.target.value);
            if (!composing) setCommittedSearch(event.target.value);
          }}
        />
        {search && (
          <button
            type="button"
            className={communityButton}
            disabled={disabled}
            aria-label="Clear member search"
            onClick={() => {
              setSearch('');
              setCommittedSearch('');
              searchRef.current?.focus();
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>
      <p role="status" className="text-sm">
        {memberIds.length} / 200 selected
      </p>
      {memberIds.length > 0 && (
        <ul className="max-h-32 overflow-y-auto space-y-1" aria-label="Selected members">
          {memberIds.map((id) => (
            <li key={id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">
                {labels[id] ||
                  members.data?.data.find((member) => member.userId === id)?.username ||
                  id}
              </span>
              <button
                type="button"
                disabled={disabled}
                className={communityButton}
                aria-label={`Remove access for ${labels[id] || id}`}
                onClick={() => onChange(memberIds.filter((value) => value !== id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="min-h-24 max-h-56 overflow-y-auto space-y-1">
        {members.isPending && <p role="status">Loading members…</p>}
        {members.isError && (
          <div role="alert">
            Members could not be loaded.{' '}
            <button
              type="button"
              className={communityButton}
              onClick={() => void members.refetch()}
            >
              Try again
            </button>
          </div>
        )}
        {members.isSuccess && members.data.data.length === 0 && (
          <p>No members found. Try another name.</p>
        )}
        {members.isSuccess &&
          members.data.data.map((member) => {
            const implicit = member.role === 'OWNER' || member.role === 'ADMIN';
            const checked = memberIds.includes(member.userId);
            return (
              <label
                key={member.userId}
                className="flex items-center gap-3 rounded-xl p-2 hover:bg-purple-500/10"
              >
                <input
                  type="checkbox"
                  checked={implicit || checked}
                  disabled={disabled || implicit || (!checked && memberIds.length >= 200)}
                  className="size-4 accent-purple-600 focus-visible:outline-2 focus-visible:outline-purple-500"
                  onChange={() => {
                    setLabels((current) => ({
                      ...current,
                      [member.userId]: member.displayName || member.username,
                    }));
                    onChange(
                      checked
                        ? memberIds.filter((id) => id !== member.userId)
                        : [...memberIds, member.userId],
                    );
                  }}
                />
                <span className="min-w-0 text-sm">
                  <span className="block truncate">{member.displayName || member.username}</span>
                  <span className="block text-xs text-gray-500">
                    @{member.username}
                    {implicit ? ' · Always has access' : ''}
                  </span>
                </span>
              </label>
            );
          })}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className={communityButton}
          disabled={disabled || cursors.length <= 1 || members.isFetching}
          onClick={() => setPaging({ q, cursors: cursors.slice(0, -1) })}
        >
          Previous members
        </button>
        <button
          type="button"
          className={communityButton}
          disabled={
            disabled || !members.isSuccess || !members.data.nextCursor || members.isFetching
          }
          onClick={() => {
            if (members.data?.nextCursor)
              setPaging({ q, cursors: [...cursors, members.data.nextCursor] });
          }}
        >
          Next members
        </button>
      </div>
    </div>
  );
}
