import React from 'react';
import VerifiedCheckmark from './VerifiedCheckmark';
import UserBadgeIcon from './UserBadgeIcon';

interface UserNameWithBadgesProps {
  displayName?: string | null;
  username: string;
  isVerified?: boolean;
  primaryBadge?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  nameClassName?: string;
}

export function UserNameWithBadges({
  displayName,
  username,
  isVerified = false,
  primaryBadge = null,
  size = 'md',
  className = '',
  nameClassName = '',
}: UserNameWithBadgesProps) {
  const nameToDisplay = displayName || username;

  const fontSizes = {
    sm: 'text-xs font-semibold',
    md: 'text-sm font-semibold',
    lg: 'text-base font-bold',
  };

  const badgeSizes = {
    sm: 'sm' as const,
    md: 'sm' as const,
    lg: 'md' as const,
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 min-w-0 max-w-full leading-none ${className}`}
    >
      <span className={`truncate text-white ${fontSizes[size]} ${nameClassName}`}>
        {nameToDisplay}
      </span>

      {isVerified && <VerifiedCheckmark size={badgeSizes[size]} />}
      {primaryBadge && <UserBadgeIcon badgeId={primaryBadge} size={badgeSizes[size]} />}
    </div>
  );
}

export default UserNameWithBadges;
