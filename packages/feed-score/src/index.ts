/**
 * Public surface of @social-network/feed-score.
 *
 * Portable entry point: Node.js, browsers, React Native / Hermes. No Node.js
 * APIs, no env access. The optional Rust accelerator is loaded by
 * @social-network/native.
 */

export type {
  CandidateFeatures,
  MutualInfo,
  ReasonType,
  RecommendationReason,
  ScoredCandidate,
  ScoreParts,
  ScoringOptions,
  ScoringWeights,
} from './types';
export { FEED_PRESETS, LEGACY_WEIGHTS, parsePresetName } from './types';
export type { FeedPresetName } from './types';
export { buildInterestVector, normalizeTag, topVocabulary } from './producer';
export {
  rankCandidates,
  resolveOptions,
  scoreAffinity,
  scoreMutual,
  scorePopularity,
  scoreProximity,
  scoreRecency,
} from './score';
export type { ResolvedOptions } from './score';
