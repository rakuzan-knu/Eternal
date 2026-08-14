import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import BadgeModal, { Badge } from './BadgeModal';
import UserBadgeIcon from '@/entities/profile/ui/UserBadgeIcon';

interface BadgeListProps {
  badges: Badge[];
}

export default function BadgeList({ badges }: BadgeListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!badges || badges.length === 0) return null;

  const MAX_VISIBLE = 5;
  const visibleBadges = badges.slice(0, MAX_VISIBLE);
  const hasMore = badges.length > MAX_VISIBLE;
  const blockSize = 'w-[32px] h-[32px]';

  return (
    <>
      <div className="flex items-center gap-1 z-10">
        {visibleBadges.map((badge) => (
          <div
            key={badge.id}
            className={`flex items-center justify-center ${blockSize} rounded-lg hover:bg-white/[0.08] transition-all duration-200 cursor-pointer border border-transparent hover:border-white/[0.1]`}
          >
            <UserBadgeIcon badgeId={badge.id} size="md" showTooltip={true} />
          </div>
        ))}

        {hasMore && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`group relative flex items-center justify-center ${blockSize} rounded-lg bg-white/[0.02] hover:bg-white/[0.08] transition-all duration-200 border border-white/[0.05] hover:border-white/[0.1]`}
          >
            <MoreHorizontal
              size={14}
              className="text-gray-400 group-hover:text-white transition-colors"
            />
          </button>
        )}
      </div>

      <BadgeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} badges={badges} />
    </>
  );
}
