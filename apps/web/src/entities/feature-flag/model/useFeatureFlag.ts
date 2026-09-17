import { useQuery } from '@tanstack/react-query';
import { featureFlagsApi } from '@/shared/api/featureFlagsApi';
import { queryKeys } from '@/shared/api/queryKeys';
import type { FeatureFlagEvaluationDto } from '@common/contracts';

const OVERRIDE_PREFIX = 'ff_override_';

/**
 * Check if a local QA override exists in localStorage.
 */
function getLocalOverride(key: string): boolean | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const val = window.localStorage.getItem(`${OVERRIDE_PREFIX}${key}`);
    if (val === 'true') return true;
    if (val === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch and evaluate all feature flags for current user.
 * Cached in IndexedDB across offline sessions.
 */
export function useFeatureFlags() {
  const query = useQuery<Record<string, FeatureFlagEvaluationDto>>({
    queryKey: queryKeys.featureFlags.all,
    queryFn: ({ signal }) => featureFlagsApi.getFlags(signal),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  });

  const flagsMap = query.data ?? {};

  const isFlagEnabled = (key: string, defaultEnabled = false): boolean => {
    // 1. Local QA / Developer override takes priority
    const override = getLocalOverride(key);
    if (override !== null) {
      return override;
    }

    // 2. Server evaluation
    if (key in flagsMap) {
      return flagsMap[key]?.enabled ?? defaultEnabled;
    }

    return defaultEnabled;
  };

  const getFlagVariant = (key: string): string | null => {
    return flagsMap[key]?.variant ?? null;
  };

  return {
    ...query,
    flags: flagsMap,
    isFlagEnabled,
    getFlagVariant,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/**
 * Hook to check if a specific feature flag is active.
 *
 * @example
 * const isCompactFeedEnabled = useFeatureFlag('compact_feed');
 */
export function useFeatureFlag(flagKey: string, defaultEnabled = false): boolean {
  const { isFlagEnabled } = useFeatureFlags();
  return isFlagEnabled(flagKey, defaultEnabled);
}

/**
 * Hook to retrieve A/B testing variant for a specific feature flag.
 */
export function useFeatureFlagVariant(flagKey: string): string | null {
  const { getFlagVariant } = useFeatureFlags();
  return getFlagVariant(flagKey);
}
