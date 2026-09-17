/**
 * Interest-vector producer: hashtags of recent content -> L2-normalized
 * embedding over a shared vocabulary. Deterministic (ties broken by tag
 * order), portable, dependency-light (hashtag scan via text-pipeline).
 *
 * Pipeline: topVocabulary(globalTagCounts, dim) once (cached server-side),
 * then buildInterestVector(contents, vocabulary) per user. Same vocabulary
 * for viewer and candidates — otherwise cosine is meaningless.
 */

import { extractHashtags } from '@social-network/text-pipeline';

export function normalizeTag(tag: string): string {
  const lower = tag.toLowerCase();
  return lower.startsWith('#') ? lower.slice(1) : lower;
}

/**
 * Top-dim tags by count desc, ties by tag asc (deterministic everywhere).
 * Accepts a record or pre-sorted entries; returns lowercased bare tags.
 */
export function topVocabulary(
  tagCounts: Readonly<Record<string, number>> | ReadonlyArray<readonly [string, number]>,
  dim: number,
): string[] {
  if (!(dim > 0)) return [];
  const totals = new Map<string, number>();
  const add = (tag: string, count: number): void => {
    const key = normalizeTag(tag);
    if (key.length === 0 || !Number.isFinite(count) || count <= 0) return;
    totals.set(key, (totals.get(key) ?? 0) + count);
  };
  if (Array.isArray(tagCounts)) {
    for (const [t, c] of tagCounts) add(t, c);
  } else {
    for (const [t, c] of Object.entries(tagCounts)) add(t, c);
  }
  const entries = Array.from(totals.entries());
  entries.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return entries.slice(0, dim).map(([tag]) => tag);
}

/**
 * L2-normalized hashtag-count vector over `vocabulary`. Zero vector when
 * nothing matches (affinity then scores 0 by definition).
 */
export function buildInterestVector(
  contents: readonly string[],
  vocabulary: readonly string[],
): number[] {
  const vec = new Array<number>(vocabulary.length).fill(0);
  if (vocabulary.length === 0) return vec;
  const index = new Map<string, number>();
  vocabulary.forEach((tag, i) => {
    if (!index.has(tag)) index.set(tag, i);
  });
  for (const content of contents) {
    if (typeof content !== 'string') continue;
    for (const raw of extractHashtags(content)) {
      const pos = index.get(normalizeTag(raw));
      if (pos !== undefined) vec[pos] += 1;
    }
  }
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (!(norm > 0)) return vec;
  return vec.map((v) => v / norm);
}
