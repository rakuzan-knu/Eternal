/**
 * Portable text-pipeline v1 types. Strings and plain data only — no Buffer,
 * no Node APIs — so the same signatures work on web, React Native / Hermes,
 * Electron, and Node.
 */

/** A located token. start/end are UTF-16 code-unit offsets (native TS string indexing). */
export interface Span {
  readonly value: string;
  readonly start: number;
  readonly end: number;
}

export interface LinkSpan extends Span {
  /** Normalized absolute URL (http/https only). */
  readonly url: string;
}

export type SpamReasonCode =
  | 'TOO_MANY_MENTIONS'
  | 'TOO_MANY_HASHTAGS'
  | 'TOO_MANY_LINKS'
  | 'EXCESSIVE_CAPS'
  | 'REPEATED_CHARS'
  | 'SUSPICIOUS_PHRASE'
  | 'SHOUTING_WITH_LINKS';

export interface SpamScore {
  /** 0 (clean) .. 1 (certain spam). Deterministic for fixed input+options. */
  readonly score: number;
  readonly reasons: readonly SpamReasonCode[];
}

export interface PipelineOptions {
  /** Hard input ceiling; longer inputs are truncated (default 10_000, mirrors backend legacy). */
  readonly maxLength?: number;
  /** Strip all HTML vs allow the rich allowlist (default 'text'). */
  readonly mode?: 'text' | 'rich';
  /** Autolink bare URLs in rich output (default true in rich mode). */
  readonly linkify?: boolean;
  readonly maxMentions?: number;
  readonly maxHashtags?: number;
  readonly maxLinks?: number;
}

export interface PipelineResult {
  /** Sanitized plain text (tags stripped, entities decoded, trimmed). */
  readonly text: string;
  /** Sanitized HTML: escaped text in text mode, allowlisted HTML in rich mode. */
  readonly html: string;
  readonly mentions: readonly string[];
  readonly mentionSpans: readonly Span[];
  readonly hashtags: readonly string[];
  readonly hashtagSpans: readonly Span[];
  readonly links: readonly LinkSpan[];
  readonly spam: SpamScore;
  /** True when any cap was exceeded (caller maps to 400/product rules). */
  readonly capped: boolean;
  /** True when the input was truncated to maxLength. */
  readonly truncated: boolean;
}

export const DEFAULT_MAX_LENGTH = 10_000 as const;
export const DEFAULT_MAX_USERNAME_LEN = 32 as const;
export const DEFAULT_MAX_HASHTAG_LEN = 100 as const;
