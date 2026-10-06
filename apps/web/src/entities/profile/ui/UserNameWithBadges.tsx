import React from 'react';
import type { DisplayNameStyleDto } from '@social-network/shared-contracts';
import VerifiedCheckmark from './VerifiedCheckmark';
import UserBadgeIcon from './UserBadgeIcon';
import StyledDisplayName from '@/shared/ui/StyledDisplayName';

interface UserNameWithBadgesProps {
  displayName?: string | null | undefined;
  username: string;
  nameStyle?: DisplayNameStyleDto | null | undefined;
  userId?: string | null | undefined;
  isCurrentUser?: boolean | undefined;
  isVerified?: boolean | undefined;
  primaryBadge?: string | null | undefined;
  size?: ('sm' | 'md' | 'lg') | undefined;
  className?: string | undefined;
  nameClassName?: string | undefined;
  prCount?: number | undefined;
  reportCount?: number | undefined;
  subscriptionMonths?: number | undefined;
  subscriptionDate?: string | undefined;
}

export function UserNameWithBadges({
  displayName,
  username,
  nameStyle,
  userId,
  isCurrentUser,
  isVerified = false,
  primaryBadge = null,
  size = 'md',
  className = '',
  nameClassName = '',
  prCount,
  reportCount,
  subscriptionMonths,
  subscriptionDate,
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
      <StyledDisplayName
        name={nameToDisplay}
        nameStyle={nameStyle}
        userId={userId}
        isCurrentUser={isCurrentUser}
        className={fontSizes[size]}
        nameClassName={nameClassName}
      />

      {isVerified && (
        <VerifiedCheckmark
          isVerified={isVerified}
          size={badgeSizes[size]}
          className="self-center"
        />
      )}
      {primaryBadge && (
        <UserBadgeIcon
          badgeId={primaryBadge}
          size={badgeSizes[size]}
          prCount={prCount}
          reportCount={reportCount}
          subscriptionMonths={subscriptionMonths}
          subscriptionDate={subscriptionDate}
        />
      )}
    </div>
  );
}

export default UserNameWithBadges;
