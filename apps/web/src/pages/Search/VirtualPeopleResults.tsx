import { useLayoutEffect, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import type {
  AvatarDecorationDto,
  NameplateDto,
  DisplayNameStyleDto,
} from '@social-network/shared-contracts';
import Avatar from '@/shared/ui/Avatar';
import StyledDisplayName from '@/shared/ui/StyledDisplayName';
import { Nameplate } from '@/shared/ui/Nameplate';
import { FollowButton } from '@/features/follow/ui/FollowButton';
import { VerifiedCheckmark } from '@/entities/profile/ui/VerifiedCheckmark';

interface Person {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  activeDecoration?: AvatarDecorationDto | null;
  activeNameplate?: NameplateDto | null;
  displayNameStyle?: DisplayNameStyleDto | null;
  isVerified?: boolean;
  primaryBadge?: string | null;
  followersCount?: number;
  isFollowing?: boolean;
  bio?: string | null;
}

export function VirtualPeopleResults<T extends Person>({
  users,
  currentUserId,
  onSelect,
}: {
  users: T[];
  currentUserId: string | null;
  onSelect: (user: T) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);
  const virtualizer = useWindowVirtualizer({
    count: users.length,
    // Rows have one name, one handle and at most one clamped bio line.
    // Fixed geometry avoids synchronous remeasurement during large scroll jumps.
    estimateSize: (index) => (users[index].bio ? 80 : 64),
    getItemKey: (index) => users[index].id,
    overscan: 5,
    scrollMargin,
    enabled: users.length > 20,
  });
  useLayoutEffect(() => {
    const update = () =>
      setScrollMargin((container.current?.getBoundingClientRect().top ?? 0) + window.scrollY);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  const row = (user: T) => (
    <div
      role="listitem"
      tabIndex={0}
      onClick={() => onSelect(user)}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && event.key === 'Enter') onSelect(user);
      }}
      className="nameplate-row py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] rounded-2xl px-2 cursor-pointer group"
    >
      <Nameplate nameplate={user.activeNameplate} alwaysPlay={true} />
      <div data-nameplate-text className="flex items-center gap-3.5 min-w-0">
        <Avatar src={user.avatar} decoration={user.activeDecoration} userId={user.id} size="md" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            <StyledDisplayName
              name={user.displayName || user.username}
              style={user.displayNameStyle}
              userId={user.id}
              className="text-white font-semibold text-sm group-hover:text-purple-300 truncate"
            />
            <VerifiedCheckmark
              isVerified={user.isVerified}
              primaryBadge={user.primaryBadge}
              size="sm"
            />
          </div>
          <span className="text-xs text-gray-400 truncate">
            @{user.username} · {(user.followersCount ?? 0).toLocaleString()} followers
          </span>
          {user.bio && <span className="text-xs text-gray-300 mt-1 line-clamp-1">{user.bio}</span>}
        </div>
      </div>
      {currentUserId !== user.id && (
        <FollowButton
          authorId={user.id}
          isFollowing={user.isFollowing ?? false}
          className="shrink-0 text-xs px-3.5 py-1"
        />
      )}
    </div>
  );
  return (
    <div
      ref={container}
      role="list"
      aria-label="People"
      style={
        users.length > 20
          ? { position: 'relative', height: virtualizer.getTotalSize(), overflowAnchor: 'none' }
          : undefined
      }
    >
      {users.length <= 20
        ? users.map((user) => <div key={user.id}>{row(user)}</div>)
        : virtualizer.getVirtualItems().map((item) => (
            <div
              key={item.key}
              data-index={item.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: item.size,
                transform: `translateY(${item.start - scrollMargin}px)`,
              }}
            >
              {row(users[item.index])}
            </div>
          ))}
    </div>
  );
}
