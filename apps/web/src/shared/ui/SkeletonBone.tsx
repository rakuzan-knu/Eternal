export default function SkeletonBone({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton-shimmer ${className}`} />;
}
