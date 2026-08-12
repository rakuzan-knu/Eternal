import SkeletonBone from '@/shared/ui/SkeletonBone';

export function SkeletonMessage({
  own = false,
  withMedia = false,
}: {
  own?: boolean;
  withMedia?: boolean;
}) {
  return (
    <div className={`flex items-end gap-2 px-4 py-1 ${own ? 'justify-end' : 'justify-start'}`}>
      {!own && <SkeletonBone className="h-8 w-8 flex-shrink-0 rounded-full" />}
      <div className={`flex max-w-[70%] flex-col gap-1 ${own ? 'items-end' : 'items-start'}`}>
        {withMedia && <SkeletonBone className="h-44 w-[260px] max-w-[62vw] rounded-2xl" />}
        <SkeletonBone className={`h-10 rounded-2xl ${own ? 'w-52' : 'w-64 max-w-[64vw]'}`} />
        <SkeletonBone className="h-2.5 w-12 rounded-md" />
      </div>
      {own && <div className="w-8 flex-shrink-0" />}
    </div>
  );
}

export function OlderMessagesSkeleton() {
  return (
    <div className="pb-2" role="status" aria-label="Loading older messages">
      <SkeletonMessage />
      <SkeletonMessage own />
    </div>
  );
}

export function MessageThreadSkeleton() {
  return (
    <div className="flex flex-col justify-end gap-1" role="status" aria-label="Loading messages">
      <div className="flex items-center gap-3 px-4 my-3">
        <div className="flex-1 h-px bg-white/5" />
        <SkeletonBone className="h-3 w-16 rounded-md" />
        <div className="flex-1 h-px bg-white/5" />
      </div>
      <SkeletonMessage withMedia />
      <SkeletonMessage own />
      <SkeletonMessage />
      <SkeletonMessage own withMedia />
      <SkeletonMessage />
    </div>
  );
}
