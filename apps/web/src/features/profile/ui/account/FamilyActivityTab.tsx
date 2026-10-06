import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Eye,
  QrCode,
  UserPlus,
  MessageSquare,
  PhoneCall,
  CreditCard,
  Gift,
  Flag,
  Clock,
  PiggyBank,
  Settings,
  X as XIcon,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeStore } from '@/shared/model/useThemeStore';
import { familyApi } from '../../api/familyApi';
import {
  FamilyActivitySummary,
  FamilyActivitySummaryResponse,
} from '../../model/familyCenterTypes';

interface FamilyActivityTabProps {
  isTeen: boolean;
  onNavigateToMyFamily: () => void;
  accentColor?: string;
  textOnAccent?: string;
}

export const FamilyActivityTab: React.FC<FamilyActivityTabProps> = ({
  isTeen,
  onNavigateToMyFamily,
  accentColor,
  textOnAccent,
}) => {
  const isGlass = useThemeStore(
    (s) => s.isGlassmorphismEnabled || s.glassmorphismOpacity > 0 || s.themeMode === 'wallpaper',
  );
  const [summary, setSummary] = useState<FamilyActivitySummary | null>(null);

  useEffect(() => {
    if (isTeen) {
      familyApi
        .getMyActivity()
        .then((res: FamilyActivitySummary) => setSummary(res))
        .catch(() => {});
    }
  }, [isTeen]);

  const cardBaseStyle = isGlass
    ? 'glass-card border-white/10 shadow-lg'
    : 'bg-black/[0.02] dark:bg-white/[0.02] border border-black/8 dark:border-white/[0.06] shadow-xs';

  const rowBaseStyle = isGlass
    ? 'hover:bg-white/5 border-b border-white/5'
    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02] border-b border-black/5 dark:border-white/[0.06]';

  return (
    <div className="flex flex-col gap-6 animate-fadeIn pb-8">
      {/* 1. Hero Card */}
      <div
        className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 transition-all duration-300 ${cardBaseStyle}`}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 relative z-10">
          <div className="flex flex-col gap-2.5 flex-1 min-w-0 pr-0 sm:pr-2">
            <h2 className="text-lg sm:text-xl font-extrabold leading-snug tracking-tight text-gray-950 dark:text-white">
              {isTeen
                ? 'Family Center: Share your platform activity'
                : 'Stay informed about how your teen uses the platform.'}
            </h2>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              We built Family Center to give you more insight into your teen's platform activity and
              help you practice positive digital habits together.{' '}
              <Link
                to="/safety-family-center"
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-0.5 ml-1"
              >
                Learn more
              </Link>
            </p>

            <div className="pt-1.5">
              <button
                type="button"
                onClick={onNavigateToMyFamily}
                style={{
                  backgroundColor: accentColor || '#5865F2',
                  color: textOnAccent || '#ffffff',
                }}
                className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2 group"
              >
                <span>Get Started</span>
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-1 transition-transform text-white"
                />
              </button>
            </div>
          </div>

          {/* Transparent Mascot + Mentor Illustration */}
          <div className="relative shrink-0 w-36 h-36 sm:w-44 sm:h-44 flex items-center justify-center select-none">
            {/* Ambient Radial Glow */}
            <div
              className="absolute w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40"
              style={{ backgroundColor: accentColor || '#8B5CF6' }}
            />

            <img
              src="/images/family-center/family_activity_hero_clean.png"
              alt="Mascot and Mentor reading glowing book"
              className="w-full h-full object-contain pointer-events-none select-none transition-transform duration-500 hover:scale-105"
            />
          </div>
        </div>
      </div>

      {/* Mirrored Teen Telemetry Card (UK AADC Transparency) */}
      {isTeen && (
        <div className={`p-5 rounded-2xl flex flex-col gap-3 ${cardBaseStyle}`}>
          <div className="flex items-center gap-2 text-gray-950 dark:text-white font-bold text-sm">
            <Sparkles size={16} className="text-gray-950 dark:text-white" />
            <span>Your 7-day activity overview (what parents see)</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            In accordance with platform transparency standards, you see the exact same activity data
            your parent or guardian sees. The content of your private messages and calls remains
            strictly confidential.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">New friends</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                +{summary?.newFriendsCount ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Active chats</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {summary?.messagingUsersCount ?? 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Call duration</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {summary?.voiceVideoMinutes ?? 0} min
              </span>
            </div>
            <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex flex-col">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Purchases</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                ${summary?.purchaseAmount ?? 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Three Explanation Cards */}
      <div className="flex flex-col gap-3">
        {/* Card 1 */}
        <div className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl ${cardBaseStyle}`}>
          <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-gray-950 dark:text-white">
            <ShieldCheck size={20} className="text-gray-950 dark:text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-sm font-bold text-gray-950 dark:text-white">
              Messages Remain Private
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
              You'll know who your teen connects with without intruding on their private
              conversations.
            </p>
          </div>
        </div>

        {/* Card 2 */}
        <div className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl ${cardBaseStyle}`}>
          <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-gray-950 dark:text-white">
            <Eye size={20} className="text-gray-950 dark:text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-sm font-bold text-gray-950 dark:text-white">
              Transparent Activity Summaries
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
              You and your teen see the exact same data, ensuring open and honest communication.
            </p>
          </div>
        </div>

        {/* Card 3 */}
        <div className={`flex items-start gap-4 p-4 sm:p-5 rounded-2xl ${cardBaseStyle}`}>
          <div className="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-gray-950 dark:text-white">
            <QrCode size={20} className="text-gray-950 dark:text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <h4 className="text-sm font-bold text-gray-950 dark:text-white">Easy to Connect</h4>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
              Connect in seconds by simply scanning the QR code shared by your teen.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Section: What connected parents can see */}
      <div className="flex flex-col gap-3 pt-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-950 dark:text-white">
            What connected parents can see
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
            We want you to stay informed about what your teen is doing on our platform so you can
            support them. Both of you have access to the same information to foster healthy
            conversations around digital safety. You will see:
          </p>
        </div>

        <div className={`rounded-2xl overflow-hidden border ${cardBaseStyle}`}>
          {/* Row 1 */}
          <div className={`flex items-start gap-4 p-4 transition-colors ${rowBaseStyle}`}>
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-gray-950 dark:text-white">
              <UserPlus size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-950 dark:text-white">New Friends</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Mutual friendships formed in the past 7 days (when both users mutually follow each
                other).
              </span>
            </div>
          </div>

          {/* Row 2 */}
          <div className={`flex items-start gap-4 p-4 transition-colors ${rowBaseStyle}`}>
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-gray-950 dark:text-white">
              <MessageSquare size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-950 dark:text-white">
                Direct Messaging & Active Conversations
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Includes direct messages and group chats active over the last 7 days.
              </span>
            </div>
          </div>

          {/* Row 3 */}
          <div className={`flex items-start gap-4 p-4 transition-colors ${rowBaseStyle}`}>
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-gray-950 dark:text-white">
              <PhoneCall size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-950 dark:text-white">
                Voice & Video Call Time
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Total duration of calls in direct and group chats (in minutes).
              </span>
            </div>
          </div>

          {/* Row 4 */}
          <div className={`flex items-start gap-4 p-4 transition-colors ${rowBaseStyle}`}>
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-gray-950 dark:text-white">
              <CreditCard size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-950 dark:text-white">
                Purchase Amount
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                All purchases made by your teen in USD ($), including store items and subscriptions.
              </span>
            </div>
          </div>

          {/* Row 6 */}
          <div className={`flex items-start gap-4 p-4 transition-colors ${rowBaseStyle}`}>
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-gray-950 dark:text-white">
              <Gift size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-950 dark:text-white">
                Received Gifts
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                All gifts received by your teen over the past week, along with sender names and
                amounts.
              </span>
            </div>
          </div>

          {/* Row 7 */}
          <div className={`flex items-start gap-4 p-4 transition-colors`}>
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-gray-950 dark:text-white">
              <Flag size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-950 dark:text-white">
                Reports Shared by Your Teen
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                If your teen chooses to share a safety report with you, you'll receive an email
                notification.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Section: What connected parents can manage */}
      <div className="flex flex-col gap-3 pt-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-950 dark:text-white">
            What connected parents can manage
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
            Connected parents can configure safety controls to help teens explore the platform
            responsibly.
          </p>
        </div>

        <div className={`rounded-2xl overflow-hidden border ${cardBaseStyle}`}>
          {/* Row 1 */}
          <div className={`flex items-start gap-4 p-4 transition-colors ${rowBaseStyle}`}>
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-gray-950 dark:text-white">
              <Clock size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-950 dark:text-white">
                Screen Time Limits
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Help your teen take breaks by setting daily limits and scheduled downtime when the
                platform is restricted.
              </span>
            </div>
          </div>

          {/* Row 2 */}
          <div className={`flex items-start gap-4 p-4 transition-colors ${rowBaseStyle}`}>
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-gray-950 dark:text-white">
              <PiggyBank size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-950 dark:text-white">
                Spending Limits
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Set a monthly budget for your teen's purchases, including shop items, gifts, and
                goods.
              </span>
            </div>
          </div>

          {/* Row 3 */}
          <div className={`flex items-start gap-4 p-4 transition-colors`}>
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-gray-950 dark:text-white">
              <Settings size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-950 dark:text-white">
                Teen Account Settings
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Manage essential safety settings on your teen's account that cannot be modified
                without parental authorization.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Section: What connected parents cannot see (Red X) */}
      <div className="flex flex-col gap-3 pt-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-950 dark:text-white">
            What connected parents cannot see
          </h3>
        </div>

        <div className={`flex items-start gap-4 p-4 rounded-2xl border ${cardBaseStyle}`}>
          <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/20 text-red-500 flex items-center justify-center shrink-0 mt-0.5">
            <XIcon size={20} className="stroke-[3]" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-red-500 dark:text-red-400">
              What your teen writes or says
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              You cannot see the private contents of your teen's messages or listen to their calls.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyActivityTab;
