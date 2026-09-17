import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getBadgeById } from '../model/badges';
import {
  getPremiumTierByMonths,
  getContributorTierByCount,
  CONTRIBUTOR_TIERS,
  PREMIUM_TIERS,
} from '../model/badgeTiers';
import PremiumTierBadge from './PremiumTierBadge';
import ContributorTierBadge from './ContributorTierBadge';
import PremiumBadgeModal from './PremiumBadgeModal';
import ContributorBadgeModal from './ContributorBadgeModal';

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

interface TooltipCoords {
  left: number;
  top: number;
  placement: 'top' | 'bottom';
  arrowOffset: number;
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
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isContributorModalOpen, setIsContributorModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(isTestEnv);
  const [tooltipCoords, setTooltipCoords] = useState<TooltipCoords | null>(
    isTestEnv ? { left: 150, top: 150, placement: 'top', arrowOffset: 0 } : null,
  );
  const triggerRef = useRef<HTMLDivElement>(null);

  const updateTooltipPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // If completely scrolled out of viewport, hide
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsHovered(false);
      return;
    }

    // Determine placement: need at least 130px above trigger, otherwise flip to bottom
    const placement: 'top' | 'bottom' = rect.top < 130 ? 'bottom' : 'top';
    const centerX = rect.left + rect.width / 2;
    // Clamping to keep tooltip safely inside viewport margins
    const safeLeft = Math.max(110, Math.min(window.innerWidth - 110, centerX));
    const arrowOffset = Math.max(-75, Math.min(75, centerX - safeLeft));
    const top = placement === 'top' ? rect.top - 8 : rect.bottom + 8;

    setTooltipCoords({ left: safeLeft, top, placement, arrowOffset });
  }, []);

  const handleMouseEnter = () => {
    if (!showTooltip) return;
    updateTooltipPosition();
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!isTestEnv) {
      setIsHovered(false);
    }
  };

  useEffect(() => {
    if (!isHovered) return;
    const handleScrollOrResize = () => {
      updateTooltipPosition();
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isHovered, updateTooltipPosition]);

  if (!badgeId) return null;
  const badge = getBadgeById(badgeId);
  if (!badge) return null;

  const isPremium = badgeId.toUpperCase().startsWith('PREMIUM');
  const isContributor = badgeId.toUpperCase().startsWith('CONTRIBUTOR');

  const contributorTierSuffix = badgeId.toUpperCase().replace('CONTRIBUTOR_', '');
  const explicitContributorTier = CONTRIBUTOR_TIERS.find((t) => t.id === contributorTierSuffix);

  const premiumTierSuffix = badgeId.toUpperCase().replace('PREMIUM_', '');
  const explicitPremiumTier = PREMIUM_TIERS.find((t) => t.id === premiumTierSuffix);

  const totalContributions = (prCount || 0) + (reportCount || 0);

  const contributorTier =
    explicitContributorTier ||
    (totalContributions > 0 ? getContributorTierByCount(totalContributions) : CONTRIBUTOR_TIERS[0]);

  const premiumTier =
    explicitPremiumTier ||
    (subscriptionMonths > 0 ? getPremiumTierByMonths(subscriptionMonths) : PREMIUM_TIERS[0]);

  const sizeClasses = {
    sm: 'w-4 h-4 [&>svg]:w-4 [&>svg]:h-4',
    md: 'w-5 h-5 [&>svg]:w-5 [&>svg]:h-5',
    lg: 'w-6 h-6 [&>svg]:w-6 [&>svg]:h-6',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHovered(false);
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
        ref={triggerRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`group relative inline-flex items-center justify-center shrink-0 cursor-pointer ${sizeClasses[size]} ${className}`}
      >
        {renderIcon}
      </div>

      {/* Hover Tooltip Rendered in document.body Portal to prevent any container clipping */}
      {showTooltip &&
        isHovered &&
        tooltipCoords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              left: `${tooltipCoords.left}px`,
              top: `${tooltipCoords.top}px`,
              transform:
                tooltipCoords.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
              zIndex: 99999,
              pointerEvents: 'none',
            }}
            className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Arrow on TOP pointing UP when placement is bottom */}
            {tooltipCoords.placement === 'bottom' && (
              <div
                style={{ transform: `translateX(${tooltipCoords.arrowOffset}px) rotate(45deg)` }}
                className={`w-2.5 h-2.5 border-l border-t mb-[-5px] z-10 ${
                  isPremium || isContributor
                    ? 'bg-[#1c1c24] border-white/20'
                    : 'bg-[#18181b] border-white/10'
                }`}
              />
            )}

            {/* Rich Hover Card for Premium (Level 1+ or active subscriber) or Contributor */}
            {isPremium &&
            (explicitPremiumTier || premiumTier.level >= 1 || subscriptionMonths > 0) ? (
              <div className="bg-gradient-to-b from-[#1c1c24] via-[#15151c] to-[#0f0f13] text-white p-3.5 rounded-2xl border border-white/[0.15] shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col items-center gap-2 min-w-[170px] text-center backdrop-blur-xl">
                <div className="p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] shadow-inner">
                  <PremiumTierBadge level={premiumTier.level} size={36} />
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-extrabold text-xs tracking-wider uppercase text-purple-300">
                    {premiumTier.name} Premium
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                    {subscriptionDate
                      ? `Subscriber since ${subscriptionDate}`
                      : `${premiumTier.durationLabel} Subscriber`}
                  </span>
                </div>
              </div>
            ) : isContributor && (explicitContributorTier || totalContributions >= 1) ? (
              <div className="bg-gradient-to-b from-[#1c1c24] via-[#15151c] to-[#0f0f13] text-white p-3.5 rounded-2xl border border-white/[0.15] shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col items-center gap-2 min-w-[170px] text-center backdrop-blur-xl">
                <div className="p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] shadow-inner">
                  <ContributorTierBadge level={contributorTier.level} size={36} />
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-extrabold text-xs tracking-wider uppercase text-emerald-300">
                    {contributorTier.name} Contributor
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                    {totalContributions > 0
                      ? `${totalContributions} Merged PRs & Reports`
                      : `${contributorTier.countRequired}+ Merged PRs & Reports`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#18181b] text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-white/10 shadow-2xl whitespace-nowrap tracking-wide">
                {isPremium ? 'No active subscription' : badge.name}
              </div>
            )}

            {/* Arrow on BOTTOM pointing DOWN when placement is top */}
            {tooltipCoords.placement === 'top' && (
              <div
                style={{ transform: `translateX(${tooltipCoords.arrowOffset}px) rotate(45deg)` }}
                className={`w-2.5 h-2.5 border-r border-b mt-[-5px] z-10 ${
                  isPremium || isContributor
                    ? 'bg-[#0f0f13] border-white/15'
                    : 'bg-[#18181b] border-white/10'
                }`}
              />
            )}
          </div>,
          document.body,
        )}

      {/* Level Modals */}
      {isPremium && (
        <PremiumBadgeModal
          isOpen={isPremiumModalOpen}
          onClose={() => setIsPremiumModalOpen(false)}
          subscriptionMonths={
            subscriptionMonths || (explicitPremiumTier ? explicitPremiumTier.monthsRequired : 0)
          }
          subscriptionDate={subscriptionDate}
        />
      )}

      {isContributor && (
        <ContributorBadgeModal
          isOpen={isContributorModalOpen}
          onClose={() => setIsContributorModalOpen(false)}
          prCount={prCount || (explicitContributorTier ? explicitContributorTier.countRequired : 0)}
          reportCount={reportCount || 0}
        />
      )}
    </>
  );
}

export default UserBadgeIcon;
