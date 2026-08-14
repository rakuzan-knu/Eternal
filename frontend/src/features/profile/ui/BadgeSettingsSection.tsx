import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ShieldAlert, Award, Trash2, Info, Sparkles, GitPullRequest } from 'lucide-react';
import Avatar from '@/shared/ui/Avatar';
import { UserNameWithBadges } from '@/entities/profile/ui/UserNameWithBadges';
import { getBadgeById, Badge } from '@/entities/profile/model/badges';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { userApi } from '@/entities/profile/api/userApi';
import { USER_KEY } from '@/shared/api/queryKeys';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';
import UserBadgeIcon from '@/entities/profile/ui/UserBadgeIcon';
import PremiumBadgeModal from './PremiumBadgeModal';
import ContributorBadgeModal from './ContributorBadgeModal';
import {
  getPremiumTierByMonths,
  getContributorTierByCount,
} from '@/entities/profile/model/badgeTiers';

interface BadgeSettingsSectionProps {
  avatarPreview?: string | null;
  bannerPreview?: string | null;
  bannerPos?: number;
}

export function BadgeSettingsSection({
  avatarPreview,
  bannerPreview,
  bannerPos = 50,
}: BadgeSettingsSectionProps) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const addToast = useMessageToastStore.getState().addToast;

  const activeAvatar = avatarPreview ?? currentUser?.avatar ?? null;
  const activeBanner = bannerPreview ?? currentUser?.banner ?? null;

  const [draftPrimaryBadge, setDraftPrimaryBadge] = useState<string | null>(
    currentUser?.primaryBadge ?? null,
  );
  const [prevPrimaryBadge, setPrevPrimaryBadge] = useState<string | null | undefined>(
    currentUser?.primaryBadge,
  );

  if (currentUser?.primaryBadge !== prevPrimaryBadge) {
    setPrevPrimaryBadge(currentUser?.primaryBadge);
    setDraftPrimaryBadge(currentUser?.primaryBadge ?? null);
  }

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isContributorModalOpen, setIsContributorModalOpen] = useState(false);

  const userOwnedBadgeIds = currentUser?.badges || [];

  const ownedBadges: Badge[] = userOwnedBadgeIds
    .map((id) => getBadgeById(id))
    .filter(Boolean) as Badge[];

  const isChanged = draftPrimaryBadge !== (currentUser?.primaryBadge ?? null);

  const subMonths = currentUser?.subscriptionMonths ?? 0;
  const totalContribs = (currentUser?.prCount ?? 0) + (currentUser?.reportCount ?? 0);
  const premTier = getPremiumTierByMonths(subMonths);
  const contribTier = getContributorTierByCount(totalContribs);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await userApi.updatePrimaryBadge(draftPrimaryBadge);
      await queryClient.invalidateQueries({ queryKey: [USER_KEY] });
      addToast({
        id: `toast-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Badge updated',
        body: draftPrimaryBadge
          ? `Selected primary badge updated successfully.`
          : `Primary badge removed.`,
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        errorObj?.response?.data?.message ||
        errorObj?.message ||
        'Failed to update primary badge. You may not own this badge.';
      setErrorMessage(msg);
      addToast({
        id: `toast-err-${Date.now()}`,
        conversationId: '',
        messageId: '',
        title: 'Badge update error',
        body: msg,
        avatar: null,
        memberAvatars: [],
        isGroup: false,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-white animate-fadeIn" id="sec-badges">
      <div>
        <h3 className="text-xl font-bold tracking-wide flex items-center gap-2">
          <Award className="text-purple-400" size={22} />
          Profile Badges
        </h3>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
          Select one primary badge to be displayed next to your name in posts, messages, and member
          lists. Click evolving badges to view all 7 tier levels and progress.
        </p>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl overflow-hidden flex flex-col">
        <div className="h-24 w-full relative bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900/40 border-b border-white/[0.06]">
          {activeBanner ? (
            <img
              src={activeBanner}
              alt="Banner preview"
              className="w-full h-full object-cover"
              style={{ objectPosition: `50% ${bannerPos}%` }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-purple-900/40 to-blue-900/40" />
          )}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-black/60 text-purple-300 border border-purple-500/30 backdrop-blur-md font-medium">
              Live Preview
            </span>
          </div>
        </div>

        <div className="p-5 flex items-center gap-4 -mt-7 relative z-10">
          <div className="p-1 bg-[#09090b] rounded-full shadow-2xl shrink-0">
            <Avatar src={activeAvatar} size="lg" />
          </div>
          <div className="flex flex-col min-w-0 pt-5">
            <UserNameWithBadges
              displayName={currentUser?.displayName}
              username={currentUser?.username || 'user'}
              isVerified={currentUser?.isVerified}
              primaryBadge={draftPrimaryBadge}
              size="lg"
            />
            <span className="text-xs text-gray-400 font-medium mt-0.5">
              @{currentUser?.username || 'username'}
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          <ShieldAlert size={18} className="shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-300">Your Available Badges:</h4>
          {draftPrimaryBadge && (
            <button
              type="button"
              onClick={() => setDraftPrimaryBadge(null)}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 transition-all duration-200"
            >
              <Trash2 size={13} />
              Remove Badge
            </button>
          )}
        </div>

        {ownedBadges.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
            {ownedBadges.map((badge) => {
              const isSelected = draftPrimaryBadge === badge.id;
              const isPremium = badge.id.toUpperCase() === 'PREMIUM';
              const isContributor = badge.id.toUpperCase() === 'CONTRIBUTOR';

              let dynamicDesc = badge.description;
              if (isPremium)
                dynamicDesc = `Level ${premTier.level} (${premTier.name}) • Click to view all 7 levels`;
              if (isContributor)
                dynamicDesc = `Level ${contribTier.level} (${contribTier.name}) • Click to view stats`;

              return (
                <div
                  key={badge.id}
                  onClick={() => setDraftPrimaryBadge(badge.id)}
                  className={`group relative flex items-center gap-4 p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.25)]'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center justify-center min-w-[48px] h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] shadow-inner group-hover:scale-105 transition-transform duration-200">
                    <UserBadgeIcon badgeId={badge.id} size="lg" showTooltip={false} />
                  </div>

                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold text-sm truncate group-hover:text-purple-200 transition-colors">
                        {badge.name}
                      </span>
                      {(isPremium || isContributor) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPremium) setIsPremiumModalOpen(true);
                            if (isContributor) setIsContributorModalOpen(true);
                          }}
                          className="text-gray-400 hover:text-cyan-300 p-0.5 transition-colors"
                          title="View 7 Tier Levels"
                        >
                          <Info size={14} />
                        </button>
                      )}
                    </div>
                    <span className="text-gray-400 text-xs truncate mt-0.5">{dynamicDesc}</span>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Check size={14} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex flex-col items-center text-center gap-4">
            <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Award size={28} />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <h5 className="text-base font-bold text-white">No Badges Unlocked Yet</h5>
              <p className="text-xs text-gray-400 leading-relaxed">
                You haven't earned or unlocked any profile badges yet. Badges can be unlocked by
                subscribing to Premium, contributing code, or participating on the platform.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPremiumModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition"
              >
                <Sparkles size={14} /> Preview Premium Badges
              </button>
              <button
                type="button"
                onClick={() => setIsContributorModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition"
              >
                <GitPullRequest size={14} /> Preview Contributor Badges
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={handleSave}
          disabled={!isChanged || isSaving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
            isChanged && !isSaving
              ? 'bg-white text-black hover:bg-gray-200 shadow-lg hover:scale-[1.02] active:scale-[0.98]'
              : 'bg-white/10 text-gray-500 cursor-not-allowed opacity-50'
          }`}
        >
          <Check size={16} />
          {isSaving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      <PremiumBadgeModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        subscriptionMonths={subMonths}
      />
      <ContributorBadgeModal
        isOpen={isContributorModalOpen}
        onClose={() => setIsContributorModalOpen(false)}
        prCount={currentUser?.prCount ?? 0}
        reportCount={currentUser?.reportCount ?? 0}
      />
    </div>
  );
}

export default BadgeSettingsSection;
