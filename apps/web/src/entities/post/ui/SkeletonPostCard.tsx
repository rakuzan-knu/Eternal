import React from 'react';
import SkeletonBone from '@/shared/ui/SkeletonBone';

interface SkeletonPostCardProps {
  withMedia?: boolean;
}

export function SkeletonPostCard({ withMedia = false }: SkeletonPostCardProps) {
  return (
    <div
      className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-3xl p-5 shadow-lg flex flex-col gap-3"
      aria-hidden="true"
    >
      <div className="flex gap-4 items-start">
        <SkeletonBone className="w-11 h-11 rounded-full shrink-0" />

        <div className="flex flex-col flex-1 gap-2 min-w-0">
          <div className="flex items-center gap-2">
            <SkeletonBone className="h-3 w-28 rounded-md" />
            <SkeletonBone className="h-3 w-16 rounded-md" />
          </div>

          <div className="flex flex-col gap-2 mt-1">
            <SkeletonBone className="h-3 w-full rounded-md" />
            <SkeletonBone className="h-3 w-4/5 rounded-md" />
          </div>

          {withMedia && <SkeletonBone className="w-full h-104 rounded-2xl mt-1" />}

          <div className="flex justify-between items-center mt-4 max-w-[400px]">
            <SkeletonBone className="h-3 w-10 rounded-md" />
            <SkeletonBone className="h-3 w-10 rounded-md" />
            <SkeletonBone className="h-3 w-10 rounded-md" />
            <SkeletonBone className="h-3 w-6 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonFeed({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading the feed">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonPostCard key={i} withMedia={i % 3 === 1} />
      ))}
    </div>
  );
}
