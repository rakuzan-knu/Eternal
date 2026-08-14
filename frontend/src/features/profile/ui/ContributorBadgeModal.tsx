import React from 'react';
import { createPortal } from 'react-dom';
import { X, Check, GitPullRequest, ShieldCheck, Award } from 'lucide-react';
import { CONTRIBUTOR_TIERS, getContributorTierByCount } from '@/entities/profile/model/badgeTiers';
import ContributorTierBadge from '@/entities/profile/ui/ContributorTierBadge';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useGitHubPRCount } from '@/entities/profile/model/useGitHubPRCount';

interface ContributorBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prCount?: number;
  reportCount?: number;
}

export const ContributorBadgeModal: React.FC<ContributorBadgeModalProps> = ({
  isOpen,
  onClose,
  prCount = 0,
  reportCount = 0,
}) => {
  const { data: currentUser } = useCurrentUser();
  const githubUser = currentUser?.githubUsername || undefined;
  const { data: liveGitHubPRs } = useGitHubPRCount(githubUser);

  if (!isOpen) return null;

  const githubPRs = liveGitHubPRs ?? 0;
  const currentPRs = githubUser
    ? (currentUser?.mergedPrsCount ?? (prCount > 0 ? prCount : githubPRs))
    : 0;
  const currentReports = currentUser?.reportCount ?? reportCount;
  const totalContributions = currentPRs + currentReports;

  const currentTier = getContributorTierByCount(totalContributions);
  const hasUnlockedAnyTier = totalContributions >= 1;

  const nextTier = hasUnlockedAnyTier
    ? CONTRIBUTOR_TIERS.find((t) => t.level === currentTier.level + 1)
    : CONTRIBUTOR_TIERS[0];

  const prevReq = hasUnlockedAnyTier ? currentTier.countRequired : 0;
  const nextReq = nextTier ? nextTier.countRequired : 1;
  const progressPercent = Math.min(
    100,
    Math.max(0, ((totalContributions - prevReq) / (nextReq - prevReq)) * 100),
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#161622] via-[#0f0f18] to-[#0a0a0f] rounded-3xl border border-white/[0.12] shadow-[0_30px_100px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden animate-zoomIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-r from-emerald-600/20 via-teal-500/20 to-cyan-500/20 blur-2xl pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 z-20 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8 flex flex-col items-center text-center relative z-10 gap-6">
          <div className="flex flex-col items-center gap-2 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Award size={14} className="text-emerald-400" />
              Contributor Badge System
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Contributor Profile Badges
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Earn evolving badges by merging Pull Requests into our repository or submitting
              verified useful bug reports to the team.
            </p>
          </div>

          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <GitPullRequest size={20} />
              </div>
              <div className="text-left">
                <span className="text-xs text-gray-400 font-medium block">Merged PRs</span>
                <span className="text-lg font-bold text-white">{currentPRs}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <ShieldCheck size={20} />
              </div>
              <div className="text-left">
                <span className="text-xs text-gray-400 font-medium block">Useful Reports</span>
                <span className="text-lg font-bold text-white">{currentReports}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Award size={20} />
              </div>
              <div className="text-left">
                <span className="text-xs text-gray-400 font-medium block">Total Contributions</span>
                <span className="text-lg font-bold text-cyan-300">{totalContributions}</span>
              </div>
            </div>
          </div>

          {nextTier && (
            <div className="w-full flex flex-col gap-1.5 text-left">
              <div className="flex justify-between text-xs text-gray-400 font-medium">
                <span>
                  Next Level: <strong className="text-white">{nextTier.name}</strong> (
                  {nextTier.countRequired} contribution{nextTier.countRequired > 1 ? 's' : ''}{' '}
                  required)
                </span>
                <span className="text-emerald-400 font-bold">{Math.round(progressPercent)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {CONTRIBUTOR_TIERS.map((tier) => {
              const isActiveLevel = hasUnlockedAnyTier && currentTier.level === tier.level;

              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                    isActiveLevel
                      ? 'bg-emerald-500/15 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.3)] scale-[1.03] z-10'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  {isActiveLevel && (
                    <div className="absolute -top-2.5 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                      <Check size={10} /> Active
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-2 py-1">
                    <ContributorTierBadge level={tier.level} size={44} />
                    <span className="text-white font-bold text-sm">{tier.name}</span>
                    <span className="text-gray-400 text-xs font-medium">
                      {tier.countRequired}{' '}
                      {tier.countRequired === 1 ? 'PR / Report' : 'PRs / Reports'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="w-full pt-4 border-t border-white/[0.08] text-xs text-gray-400 text-center">
            <span>
              Contributions are automatically synced when a pull request is merged into main or a
              bug report is verified.
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ContributorBadgeModal;
