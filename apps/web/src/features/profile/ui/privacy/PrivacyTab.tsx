// PrivacyTab.tsx
import { useState } from 'react';
import { ChevronRight, UserCheck, AlertTriangle } from 'lucide-react';
import { usePrivacy } from '../../model/usePrivacy';
import { useFollowRequestsCount } from '../../model/useFollowRequests';
import type { PrivacyDimension } from '../../model/privacyTypes';
import PrivateAccountToggle from './PrivateAccountToggle';
import NearbyRecommendationsToggle from './NearbyRecommendationsToggle';
import PrivacyDimensionRow from './PrivacyDimensionRow';
import PrivacySettingPanel from './PrivacySettingPanel';
import FollowRequestsPanel from './FollowRequestsPanel';
import { RequestDataPackageModal } from './RequestDataPackageModal';

const DIMENSIONS: { dimension: PrivacyDimension; title: string }[] = [
  { dimension: 'LAST_SEEN', title: 'Last Seen' },
  { dimension: 'AVATAR', title: 'Profile Photo' },
  { dimension: 'BANNER', title: 'Profile Banner' },
  { dimension: 'BIO', title: 'About' },
  { dimension: 'BIRTHDAY', title: 'Birthday' },
  { dimension: 'MESSAGES', title: 'Messages' },
  { dimension: 'CALLS', title: 'Calls' },
  { dimension: 'VOICE_MESSAGES', title: 'Voice Messages' },
  { dimension: 'FORWARD_LINK', title: 'Forwarding Messages' },
  { dimension: 'GROUP_INVITES', title: 'Group Invites' },
];

export default function PrivacyTab() {
  const { data: privacy, isLoading, isError, error } = usePrivacy();
  const { data: pendingCount = 0 } = useFollowRequestsCount();

  const [openDimension, setOpenDimension] = useState<{
    dimension: PrivacyDimension;
    title: string;
  } | null>(null);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  const isPrivate = privacy?.isPrivate ?? false;

  return (
    <div className="animate-fadeIn flex flex-col gap-6">
      <PrivateAccountToggle />
      <NearbyRecommendationsToggle />

      {isError && (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border border-red-500/20 bg-red-500/[0.06]">
          <AlertTriangle size={17} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-red-300">Failed to load privacy settings</p>
            <p className="mt-0.5 text-xs text-red-400/70 break-all">
              {(error as Error)?.message ?? 'Unknown error'}
            </p>
          </div>
        </div>
      )}

      {isPrivate && (
        <button
          type="button"
          onClick={() => setRequestsOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-colors group"
        >
          <span className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-200">
            <UserCheck size={17} />
          </span>
          <span className="flex-1 text-left text-sm font-medium text-gray-200">
            Follow Requests
          </span>
          {pendingCount > 0 && (
            <span className="flex-shrink-0 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-white text-black text-xs font-bold animate-popIn">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
          <ChevronRight
            size={17}
            className="text-gray-600 group-hover:text-gray-300 transition-colors flex-shrink-0"
          />
        </button>
      )}

      <section>
        <h3 className="px-1 mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Who can see you and contact you
        </h3>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02]">
          {DIMENSIONS.map((d, i) => (
            <PrivacyDimensionRow
              key={d.dimension}
              dimension={d.dimension}
              title={d.title}
              privacy={privacy}
              isLoading={isLoading}
              onClick={() => setOpenDimension(d)}
              last={i === DIMENSIONS.length - 1}
            />
          ))}
        </div>
      </section>

      {/* Request Data Package Section */}
      <section className="p-4 rounded-2xl border border-purple-500/20 bg-purple-950/[0.15] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-white">Request All of My Data</p>
          <p className="text-xs text-neutral-300">
            Request an encrypted ZIP package with your account records, messages, and activity.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsDataModalOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.35)] transition-all shrink-0"
        >
          Request Data
        </button>
      </section>

      {openDimension && (
        <PrivacySettingPanel
          dimension={openDimension.dimension}
          title={openDimension.title}
          onClose={() => setOpenDimension(null)}
        />
      )}
      {requestsOpen && <FollowRequestsPanel onClose={() => setRequestsOpen(false)} />}
      <RequestDataPackageModal isOpen={isDataModalOpen} onClose={() => setIsDataModalOpen(false)} />
    </div>
  );
}
