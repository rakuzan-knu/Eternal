import React from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Zap, Sparkles } from 'lucide-react';
import { PREMIUM_TIERS, getPremiumTierByMonths } from '@/entities/profile/model/badgeTiers';
import PremiumTierBadge from '@/entities/profile/ui/PremiumTierBadge';
import { useCurrentUser } from '@/entities/profile/model/useCurrentUser';
import { useMessageToastStore } from '@/shared/model/useMessageToastStore';

interface PremiumBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionMonths?: number;
  subscriptionDate?: string;
}

export const PremiumBadgeModal: React.FC<PremiumBadgeModalProps> = ({
  isOpen,
  onClose,
  subscriptionMonths = 0,
  subscriptionDate = '12.08.2026',
}) => {
  const { data: currentUser } = useCurrentUser();
  const addToast = useMessageToastStore.getState().addToast;

  if (!isOpen) return null;

  const currentMonths = currentUser?.subscriptionMonths ?? subscriptionMonths;
  const currentTier = getPremiumTierByMonths(currentMonths);
  const isSubscribed = currentMonths > 0;

  const handleSubscribe = () => {
    addToast({
      id: `sub-${Date.now()}`,
      conversationId: '',
      messageId: '',
      title: 'Premium Subscription',
      body: isSubscribed
        ? 'Your Premium subscription is currently active!'
        : 'Premium subscription feature previewed! Live payments integration coming soon.',
      avatar: null,
      memberAvatars: [],
      isGroup: false,
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#161622] via-[#0f0f18] to-[#0a0a0f] rounded-3xl border border-white/[0.12] shadow-[0_30px_100px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden animate-zoomIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-r from-purple-600/20 via-fuchsia-500/20 to-cyan-500/20 blur-2xl pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 z-20 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
        >
          <X size={20} />
        </button>

        <div className="p-6 sm:p-8 flex flex-col items-center text-center relative z-10 gap-6">
          <div className="flex flex-col items-center gap-2 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold">
              <Sparkles size={14} className="text-purple-400" />
              Evolving Profile Badges
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Subscribe to Premium to get an evolving profile badge
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Unlock perks like custom emojis, HD video streaming, exclusive profile styling, and an
              evolving badge that grows with your active subscription duration.
            </p>
          </div>

          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {PREMIUM_TIERS.filter((t) => t.level >= 1).map((tier) => {
              const isActiveLevel = isSubscribed && currentTier.level === tier.level;

              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                    isActiveLevel
                      ? 'bg-purple-500/15 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.3)] scale-[1.03] z-10'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  {isActiveLevel && (
                    <div className="absolute -top-2.5 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                      <Check size={10} /> Active
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-2 py-1">
                    <PremiumTierBadge level={tier.level} size={44} />
                    <span className="text-white font-bold text-sm">{tier.name}</span>
                    <span className="text-gray-400 text-xs font-medium">{tier.durationLabel}</span>
                  </div>

                  {isActiveLevel && (
                    <div className="mt-2 pt-2 border-t border-purple-500/20 w-full text-center">
                      <span className="text-[10px] text-purple-300 font-semibold block">
                        Subscriber since {subscriptionDate}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="w-full flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-white/[0.08] gap-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Zap size={15} className="text-yellow-400 shrink-0" />
              <span>Badge levels upgrade automatically as your subscription continues.</span>
            </div>

            <button
              type="button"
              onClick={handleSubscribe}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles size={16} />
              {isSubscribed ? 'Manage Subscription' : 'Subscribe to Premium'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default PremiumBadgeModal;
