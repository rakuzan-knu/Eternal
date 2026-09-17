/**
 * Deterministic heuristic spam scorer (0..1 + reason codes).
 *
 * This is a first-pass triage signal, not an ML classifier: cheap enough to
 * run on every post/comment, stable enough to lock with golden vectors.
 * Weights are documented below; tune only with a labeled corpus + vector bump.
 *
 * Weights (additive, clamped to 1):
 *  - TOO_MANY_MENTIONS  +0.45 (mention bombing; backend caps are 5/10)
 *  - TOO_MANY_HASHTAGS  +0.30 (>8 tags)
 *  - TOO_MANY_LINKS     +0.35 (>2 links)
 *  - EXCESSIVE_CAPS     +0.25 (>60% caps over 12+ letters)
 *  - REPEATED_CHARS     +0.20 (run of 5+ identical chars, excl. CJK-safe path)
 *  - SUSPICIOUS_PHRASE  +0.40 per phrase (max +0.40 total, case-insensitive)
 *  - SHOUTING_WITH_LINKS +0.15 (caps + any link combined)
 */

import type { SpamReasonCode, SpamScore } from './types';

const SUSPICIOUS_PHRASES = [
  'free money',
  'click here',
  'buy now',
  'double your',
  'earn fast',
  'crypto giveaway',
  'send eth',
  'send btc',
  'бесплатные деньги',
  'заработай быстро',
];

export interface SpamFeatures {
  readonly mentionCount: number;
  readonly hashtagCount: number;
  readonly linkCount: number;
  readonly maxMentions: number;
  readonly maxHashtags: number;
  readonly maxLinks: number;
}

export function scoreSpamText(text: string, features: SpamFeatures): SpamScore {
  const reasons: SpamReasonCode[] = [];
  let score = 0;

  if (features.mentionCount > features.maxMentions) {
    reasons.push('TOO_MANY_MENTIONS');
    score += 0.45;
  }
  if (features.hashtagCount > 8 || features.hashtagCount > features.maxHashtags) {
    reasons.push('TOO_MANY_HASHTAGS');
    score += 0.3;
  }
  if (features.linkCount > features.maxLinks) {
    reasons.push('TOO_MANY_LINKS');
    score += 0.35;
  }

  let letters = 0;
  let caps = 0;
  // Runs count full code points (astral pairs advance by 2 units), NOT UTF-16
  // units: astral repeats like "🎉🎉🎉🎉🎉" behave identically across
  // TS/Rust/Swift/Kotlin ports. Numeric compare = zero per-char allocation.
  let runCp = -1;
  let runLen = 0;
  let hasRepeat = false;
  for (let k = 0; k < text.length;) {
    const c = text.codePointAt(k) as number;
    const isLetter = (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 0x0400 && c <= 0x04ff);
    if (isLetter) {
      letters++;
      if ((c >= 65 && c <= 90) || (c >= 0x0400 && c <= 0x042f)) caps++;
    }
    if (c === runCp) {
      runLen++;
      if (runLen >= 5 && c !== 32) hasRepeat = true;
    } else {
      runCp = c;
      runLen = 1;
    }
    k += c > 0xffff ? 2 : 1;
  }
  const shouting = letters >= 12 && caps / Math.max(1, letters) > 0.6;
  if (shouting) {
    reasons.push('EXCESSIVE_CAPS');
    score += 0.25;
  }
  if (hasRepeat) {
    reasons.push('REPEATED_CHARS');
    score += 0.2;
  }

  const lower = text.toLowerCase();
  let phraseHit = false;
  for (const phrase of SUSPICIOUS_PHRASES) {
    if (lower.indexOf(phrase) !== -1) {
      phraseHit = true;
      break;
    }
  }
  if (phraseHit) {
    reasons.push('SUSPICIOUS_PHRASE');
    score += 0.4;
  }
  if (shouting && features.linkCount > 0) {
    reasons.push('SHOUTING_WITH_LINKS');
    score += 0.15;
  }

  if (score > 1) score = 1;
  return { score: Math.round(score * 100) / 100, reasons };
}
