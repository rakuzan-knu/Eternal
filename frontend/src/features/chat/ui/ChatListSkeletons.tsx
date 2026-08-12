import SkeletonBone from '@/shared/ui/SkeletonBone';

export function ChatListSkeleton() {
  return (
    <div className="flex flex-col gap-1 pt-1" role="status" aria-label="Loading chats">
      {Array.from({ length: 9 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
          <SkeletonBone className="h-10 w-10 flex-shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <SkeletonBone className="h-3.5 w-28 rounded-md" />
              {index % 3 === 0 && <SkeletonBone className="h-3 w-10 rounded-md" />}
            </div>
            <SkeletonBone className={`h-3 rounded-md ${index % 2 === 0 ? 'w-44' : 'w-32'}`} />
          </div>
          <div className="flex w-10 flex-shrink-0 flex-col items-end gap-2">
            <SkeletonBone className="h-3 w-7 rounded-md" />
            {index % 4 === 0 && <SkeletonBone className="h-4 w-4 rounded-full" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatListMoreSkeleton() {
  return (
    <div className="space-y-1 py-2" role="status" aria-label="Loading more chats">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 animate-fadeIn">
          <SkeletonBone className="h-10 w-10 flex-shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <SkeletonBone className="h-3.5 w-28 rounded-md" />
            <SkeletonBone className="h-3 w-36 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
