import React, { useState } from 'react';
import { getBadgeById } from '../model/badges';
import { getPremiumTierByMonths, getContributorTierByCount } from '../model/badgeTiers';
import PremiumTierBadge from './PremiumTierBadge';
import ContributorTierBadge from './ContributorTierBadge';
import PremiumBadgeModal from '@/features/profile/ui/PremiumBadgeModal';
import ContributorBadgeModal from '@/features/profile/ui/ContributorBadgeModal';
import { useCurrentUser } from '../model/useCurrentUser';

interface UserBadgeIconProps {
  badgeId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
  subscriptionMonths?: number;
  subscriptionDate?: string;
  prCount?: number;
  reportCount?: number;
}

export function UserBadgeIcon({
  badgeId,
  size = 'md',
  className = '',
  showTooltip = true,
  subscriptionMonths = 0,
  subscriptionDate = '12.08.2026',
  prCount = 0,
  reportCount = 0,
}: UserBadgeIconProps) {
  const { data: currentUser } = useCurrentUser();
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isContributorModalOpen, setIsContributorModalOpen] = useState(false);

  if (!badgeId) return null;
  const badge = getBadgeById(badgeId);
  if (!badge) return null;

  const isPremium = badgeId.toUpperCase() === 'PREMIUM';
  const isContributor = badgeId.toUpperCase() === 'CONTRIBUTOR';

  const userSubMonths = currentUser?.subscriptionMonths ?? subscriptionMonths;
  const userPRs = currentUser?.prCount ?? prCount;
  const userReports = currentUser?.reportCount ?? reportCount;
  const totalContributions = userPRs + userReports;

  const premiumTier = getPremiumTierByMonths(userSubMonths);
  const contributorTier = getContributorTierByCount(totalContributions);

  const sizeClasses = {
    sm: 'w-4 h-4 [&>svg]:w-4 [&>svg]:h-4',
    md: 'w-5 h-5 [&>svg]:w-5 [&>svg]:h-5',
    lg: 'w-6 h-6 [&>svg]:w-6 [&>svg]:h-6',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPremium) {
      setIsPremiumModalOpen(true);
    } else if (isContributor) {
      setIsContributorModalOpen(true);
    }
  };

  let renderIcon = badge.icon;
  if (isPremium) {
    renderIcon = <PremiumTierBadge level={premiumTier.level} size="100%" />;
  } else if (isContributor) {
    renderIcon = <ContributorTierBadge level={contributorTier.level} size="100%" />;
  }

  return (
    <>
      <div
        onClick={handleClick}
        className={`group relative inline-flex items-center justify-center shrink-0 cursor-pointer ${sizeClasses[size]} ${className}`}
      >
        {renderIcon}

        {/* Hover Tooltip / Popover Card */}
        {showTooltip && (
          <div className="absolute bottom-[135%] left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center animate-in fade-in zoom-in-95 duration-200 pointer-events-none z-50">
            {/* Rich Hover Card for Premium (Level 1+) or Contributor */}
            {isPremium && premiumTier.level >= 1 ? (
              <div className="bg-gradient-to-b from-[#1c1c24] via-[#15151c] to-[#0f0f13] text-white p-3.5 rounded-2xl border border-white/[0.15] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center gap-2 min-w-[170px] text-center backdrop-blur-xl">
                <div className="p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] shadow-inner">
                  <PremiumTierBadge level={premiumTier.level} size={36} />
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-extrabold text-xs tracking-wider uppercase text-purple-300">
                    {premiumTier.name} Premium
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                    Subscriber since {subscriptionDate}
                  </span>
                </div>
              </div>
            ) : isContributor && totalContributions >= 1 ? (
              <div className="bg-gradient-to-b from-[#1c1c24] via-[#15151c] to-[#0f0f13] text-white p-3.5 rounded-2xl border border-white/[0.15] shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center gap-2 min-w-[170px] text-center backdrop-blur-xl">
                <div className="p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] shadow-inner">
                  <ContributorTierBadge level={contributorTier.level} size={36} />
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-extrabold text-xs tracking-wider uppercase text-emerald-300">
                    {contributorTier.name} Contributor
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                    {totalContributions} Merged PRs & Reports
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#18181b] text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-white/10 shadow-2xl whitespace-nowrap tracking-wide">
                {isPremium && premiumTier.level === 0
                  ? userSubMonths > 0
                    ? `Subscriber since ${subscriptionDate}`
                    : 'No active subscription'
                  : badge.name}
              </div>
            )}

            <div className="w-2 h-2 bg-[#18181b] border-r border-b border-white/10 transform rotate-45 -mt-1" />
          </div>
        )}
      </div>

      {/* Level Modals */}
      {isPremium && (
        <PremiumBadgeModal
          isOpen={isPremiumModalOpen}
          onClose={() => setIsPremiumModalOpen(false)}
          subscriptionMonths={userSubMonths}
          subscriptionDate={subscriptionDate}
        />
      )}

      {isContributor && (
        <ContributorBadgeModal
          isOpen={isContributorModalOpen}
          onClose={() => setIsContributorModalOpen(false)}
          prCount={userPRs}
          reportCount={userReports}
        />
      )}
    </>
  );
}

export default UserBadgeIcon;
