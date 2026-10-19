import type { ComponentPropsWithoutRef } from 'react';

export default function SkeletonBone({
  className = '',
  ...props
}: ComponentPropsWithoutRef<'div'>) {
  return <div {...props} aria-hidden="true" className={`skeleton-shimmer ${className}`} />;
}
