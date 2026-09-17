/**
 * Portable recommendation scoring v1.
 *
 * Feature math (each part normalized to [0,1]):
 *  - proximity  = max(0, 1 - distKm/radius) when permitted, dist known and
 *                 distKm <= radius, else 0. Mirrors legacy exactly.
 *  - mutual     = min(1, mutualCount/mutualDivisor).
 *  - popularity = min(1, log10(followersCount+1)/popularityScale).
 *  - recency    = 2^(-ageHours/halfLife) from lastActiveAtMs, 0 when unknown.
 *  - affinity   = cosine(viewerInterests, interests), 0 on dim mismatch or
 *                 zero norm.
 *  - final      = Σ weights[i] * parts[i], rounded to 6 decimals.
 *
 * Cross-language note: log10/exp/pow can differ in the last ULP between
 * libm implementations. Scores are rounded to 1e-6 and tests compare with
 * 1e-9 tolerance; reasons and ORDER are exact. Sorting is an explicit
 * score-desc + input-order tiebreak (stable everywhere, no engine reliance).
 */

import {
  LEGACY_WEIGHTS,
  type CandidateFeatures,
  type RecommendationReason,
  type ScoredCandidate,
  type ScoreParts,
  type ScoringOptions,
} from './types';

const LN2 = 0.6931471805599453;

export function scoreProximity(
  distKm: number | null,
  allowNearby: boolean,
  radiusKm: number,
): number {
  if (distKm === null || distKm === undefined || !allowNearby) return 0;
  if (!(distKm >= 0) || distKm > radiusKm || radiusKm <= 0) return 0;
  return Math.max(0, 1 - distKm / radiusKm);
}

export function scoreMutual(mutualCount: number, divisor: number): number {
  if (!(mutualCount > 0) || !(divisor > 0)) return 0;
  return Math.min(1, mutualCount / divisor);
}

export function scorePopularity(followersCount: number, scale: number): number {
  if (!(followersCount >= 0) || !(scale > 0)) return 0;
  return Math.min(1, Math.log10(followersCount + 1) / scale);
}

export function scoreRecency(
  lastActiveAtMs: number | null,
  nowMs: number,
  halfLifeHours: number,
): number {
  if (lastActiveAtMs === null || lastActiveAtMs === undefined || !(halfLifeHours > 0)) return 0;
  const ageHours = Math.max(0, (nowMs - lastActiveAtMs) / 3_600_000);
  return Math.exp((-LN2 * ageHours) / halfLifeHours);
}

export function scoreAffinity(
  viewer: readonly number[] | undefined | null,
  candidate: readonly number[] | undefined | null,
): number {
  if (!viewer || !candidate || viewer.length === 0 || viewer.length !== candidate.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < viewer.length; i++) {
    const a = viewer[i];
    const b = candidate[i];
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    dot += a * b;
    na += a * a;
    nb += b * b;
  }
  if (na <= 0 || nb <= 0) return 0;
  const cos = dot / Math.sqrt(na * nb);
  return Math.max(0, Math.min(1, cos));
}

function buildReason(
  mutualCount: number,
  mutuals: readonly { id: string; username: string; avatar: string | null }[],
  distKm: number | null,
  allowNearby: boolean,
  city: string | null,
  radiusKm: number,
): RecommendationReason {
  if (mutualCount >= 2 && mutuals.length >= 2) {
    const first = mutuals[0];
    const text = `Followed by ${first.username} and ${mutualCount - 1} other${mutualCount > 2 ? 's' : ''}`;
    return {
      type: 'MUTUAL_FRIENDS',
      text,
      mutualFriends: [mutuals[0], mutuals[1]],
      totalMutualCount: mutualCount,
    };
  }
  if (mutualCount === 1 && mutuals.length >= 1) {
    const first = mutuals[0];
    return {
      type: 'MUTUAL_FRIENDS',
      text: `Followed by ${first.username}`,
      mutualFriends: [first],
      totalMutualCount: 1,
    };
  }
  let proxText: string | null = null;
  if (distKm !== null && distKm !== undefined && allowNearby && distKm >= 0 && distKm <= radiusKm) {
    if (distKm <= 10) {
      proxText = 'Near you';
    } else {
      proxText = city ? `From your city (${city})` : 'Near you';
    }
  }
  if (proxText !== null) {
    return { type: proxText.startsWith('From your city') ? 'SAME_CITY' : 'NEARBY', text: proxText };
  }
  return { type: 'POPULAR', text: 'Suggested for you' };
}

export interface ResolvedOptions {
  readonly weights: {
    proximity: number;
    mutual: number;
    popularity: number;
    recency: number;
    affinity: number;
  };
  readonly radiusKm: number;
  readonly mutualDivisor: number;
  readonly popularityScale: number;
  readonly recencyHalfLifeHours: number;
  readonly viewerInterests: readonly number[] | undefined | null;
  readonly nowMs: number;
}

export function resolveOptions(options?: ScoringOptions): ResolvedOptions {
  const w = options?.weights ?? LEGACY_WEIGHTS;
  const sum = w.proximity + w.mutual + w.popularity + w.recency + w.affinity;
  if (!Number.isFinite(sum) || Math.abs(sum - 1) > 0.001) {
    throw new Error(`feed-score: weights must sum to 1 (got ${String(sum)})`);
  }
  for (const [k, v] of Object.entries(w)) {
    if (!Number.isFinite(v) || v < 0) throw new Error(`feed-score: weight ${k} must be >= 0`);
  }
  return {
    weights: w,
    radiusKm: options?.radiusKm ?? 100,
    mutualDivisor: options?.mutualDivisor ?? 5,
    popularityScale: options?.popularityScale ?? 4,
    recencyHalfLifeHours: options?.recencyHalfLifeHours ?? 720,
    viewerInterests: options?.viewerInterests,
    nowMs: options?.nowMs ?? Date.now(),
  };
}

function round6(x: number): number {
  return Math.round(x * 1_000_000) / 1_000_000;
}

/**
 * Scores + ranks candidates. Stable: ties keep input order (explicit index
 * tiebreak — identical on V8, Hermes, JSC, and Rust).
 */
export function rankCandidates(
  candidates: readonly CandidateFeatures[],
  options?: ScoringOptions,
): ScoredCandidate[] {
  const o = resolveOptions(options);
  const scored = candidates.map((c, index) => {
    const parts: ScoreParts = {
      proximity: scoreProximity(c.distKm, c.allowNearby, o.radiusKm),
      mutual: scoreMutual(c.mutualCount, o.mutualDivisor),
      popularity: scorePopularity(c.followersCount, o.popularityScale),
      recency: scoreRecency(c.lastActiveAtMs, o.nowMs, o.recencyHalfLifeHours),
      affinity: scoreAffinity(o.viewerInterests, c.interests),
    };
    const score = round6(
      parts.proximity * o.weights.proximity +
        parts.mutual * o.weights.mutual +
        parts.popularity * o.weights.popularity +
        parts.recency * o.weights.recency +
        parts.affinity * o.weights.affinity,
    );
    const reason = buildReason(
      c.mutualCount,
      c.mutuals,
      c.distKm,
      c.allowNearby,
      c.city,
      o.radiusKm,
    );
    return { id: c.id, score, parts, reason, index };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.map(({ id, score, parts, reason }) => ({ id, score, parts, reason }));
}
