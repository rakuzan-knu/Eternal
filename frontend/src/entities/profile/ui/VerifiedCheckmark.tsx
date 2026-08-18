import React from 'react';
import { UserBadgeIcon } from './UserBadgeIcon';

interface VerifiedCheckmarkProps {
  isVerified?: boolean;
  primaryBadge?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function VerifiedCheckmark({
  isVerified = true,
  primaryBadge,
  size = 'md',
  className = '',
}: VerifiedCheckmarkProps) {
  const sizeMap: Record<string, string> = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const dim = sizeMap[size] || sizeMap.md;

  if (!isVerified && !primaryBadge) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      {isVerified && (
        <span
          className={`inline-flex items-center justify-center shrink-0 ${dim} ${className}`}
          title="Verified Profile"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-[0_1px_4px_rgba(0,149,246,0.35)]"
          >
            <path
              d="M22.5 12.5c0-1.58-.8-2.97-2-3.79.44-1.46.15-3.11-.93-4.19-1.08-1.08-2.73-1.37-4.19-.93C14.56 2.38 13.17 1.5 11.59 1.5s-2.97.88-3.79 2.08c-1.46-.44-3.11-.15-4.19.93-1.08 1.08-1.37 2.73-.93 4.19C1.48 9.53.6 10.92.6 12.5s.88 2.97 2.08 3.79c-.44 1.46-.15 3.11.93 4.19 1.08 1.08 2.73 1.37 4.19.93 1.22 1.2 2.61 2.08 4.19 2.08s2.97-.88 3.79-2.08c1.46.44 3.11.15 4.19-.93 1.08-1.08 1.37-2.73.93-4.19 1.2-.82 2.08-2.21 2.08-3.79z"
              fill="#0095F6"
            />
            <path d="M10.2 16.2L6 12l1.4-1.4 2.8 2.8 6.4-6.4L17.6 8.4z" fill="#FFFFFF" />
          </svg>
        </span>
      )}
      {primaryBadge && (
        <UserBadgeIcon
          badgeId={primaryBadge}
          size={size === 'xs' ? 'sm' : (size as 'sm' | 'md' | 'lg')}
        />
      )}
    </span>
  );
}

export default VerifiedCheckmark;
