/**
 * Portable feed-score v1 types. Plain data only — no Buffer, no Node APIs.
 */

export interface MutualInfo {
  readonly id: string;
  readonly username: string;
  readonly avatar: string | null;
}

export interface CandidateFeatures {
  readonly id: string;
  /** Geodesic km from viewer; null when unknown or not permitted. */
  readonly distKm: number | null;
  readonly allowNearby: boolean;
  readonly city: string | null;
  /** Mutual follower identities (first two used for the reason card). */
  readonly mutuals: readonly MutualInfo[];
  readonly mutualCount: number;
  readonly followersCount: number;
  /** Unix ms of last activity; null when unknown. */
  readonly lastActiveAtMs: number | null;
  /** Candidate interest embedding (optional, affinity only). Null = absent. */
  readonly interests?: readonly number[] | null;
}

export interface ScoringWeights {
  readonly proximity: number;
  readonly mutual: number;
  readonly popularity: number;
  readonly recency: number;
  readonly affinity: number;
}

/** Bit-identical to the legacy backend composite (0.4/0.4/0.2, no decay/affinity). */
export const LEGACY_WEIGHTS: ScoringWeights = Object.freeze({
  proximity: 0.4,
  mutual: 0.4,
  popularity: 0.2,
  recency: 0,
  affinity: 0,
});

/** Product presets. 'balanced' activates recency+affinity (needs inputs). */
export const FEED_PRESETS = Object.freeze({
  legacy: LEGACY_WEIGHTS,
  balanced: Object.freeze({
    proximity: 0.35,
    mutual: 0.35,
    popularity: 0.15,
    recency: 0.1,
    affinity: 0.05,
  }) as ScoringWeights,
});

export type FeedPresetName = keyof typeof FEED_PRESETS;

export function parsePresetName(value: string | null | undefined): FeedPresetName {
  const normalized = (value ?? 'legacy').trim().toLowerCase();
  return normalized === 'balanced' ? 'balanced' : 'legacy';
}

export interface ScoringOptions {
  readonly weights?: ScoringWeights;
  /** Proximity radius in km (legacy: 100). */
  readonly radiusKm?: number;
  /** Mutuals divisor (legacy: 5). */
  readonly mutualDivisor?: number;
  /** Popularity log scale (legacy: log10(f+1)/4). */
  readonly popularityScale?: number;
  /** Recency half-life in hours (default 720 = 30d). */
  readonly recencyHalfLifeHours?: number;
  /** Viewer interest embedding for affinity (must match candidate dims). Null = absent. */
  readonly viewerInterests?: readonly number[] | null;
  /** Scoring clock; defaults to Date.now(). Inject in tests/vectors. */
  readonly nowMs?: number;
}

export type ReasonType = 'MUTUAL_FRIENDS' | 'NEARBY' | 'SAME_CITY' | 'POPULAR';

export interface RecommendationReason {
  readonly type: ReasonType;
  readonly text: string;
  readonly mutualFriends?: readonly MutualInfo[];
  readonly totalMutualCount?: number;
}

export interface ScoreParts {
  readonly proximity: number;
  readonly mutual: number;
  readonly popularity: number;
  readonly recency: number;
  readonly affinity: number;
}

export interface ScoredCandidate {
  readonly id: string;
  /** Weighted composite, rounded to 6 decimals (cross-language stability). */
  readonly score: number;
  readonly parts: ScoreParts;
  readonly reason: RecommendationReason;
}
