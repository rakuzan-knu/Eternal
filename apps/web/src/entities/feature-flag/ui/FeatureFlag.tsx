import React from 'react';
import { useFeatureFlag } from '../model/useFeatureFlag';

export interface FeatureFlagProps {
  flag: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  defaultEnabled?: boolean;
}

/**
 * Declarative Feature Flag Gate.
 * Renders `children` when the flag is enabled; otherwise renders `fallback`.
 *
 * @example
 * <FeatureFlag flag="compact_feed" fallback={<RegularFeed />}>
 *   <CompactFeed />
 * </FeatureFlag>
 */
export function FeatureFlag({
  flag,
  fallback = null,
  children,
  defaultEnabled = false,
}: FeatureFlagProps): React.JSX.Element | null {
  const isEnabled = useFeatureFlag(flag, defaultEnabled);

  if (isEnabled) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

export default FeatureFlag;
