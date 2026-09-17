/**
 * Public surface of @social-network/text-pipeline.
 *
 * Portable entry point: web bundles, React Native / Hermes, Electron
 * renderer/preload, and Node.js. No Node.js APIs, no env access.
 * The optional Rust accelerator is loaded by @social-network/native.
 */

export type {
  LinkSpan,
  PipelineOptions,
  PipelineResult,
  Span,
  SpamReasonCode,
  SpamScore,
} from './types';
export { DEFAULT_MAX_HASHTAG_LEN, DEFAULT_MAX_LENGTH, DEFAULT_MAX_USERNAME_LEN } from './types';
export {
  extractHashtagSpans,
  extractHashtags,
  extractMentionSpans,
  extractMentions,
  isHashtagCharCode,
  isUsernameCharCode,
} from './extract';
export type { ExtractOptions } from './extract';
export { escapeHtml, findLinks } from './linkify';
export { isSafeHttpUrl, sanitizeRich, sanitizeText } from './sanitize';
export { scoreSpamText } from './spam';
export type { SpamFeatures } from './spam';
export { levenshtein, rankFuzzy, trigramDice, trigramProfile } from './similarity';
export type { FuzzyMatch, RankFuzzyOptions } from './similarity';
export { DEFAULT_MAX_TERM_LEN } from './similarity';
export { processText } from './pipeline';
