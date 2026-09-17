/**
 * Portable fuzzy matching v1: bounded Levenshtein + trigram Dice.
 *
 * Design rules (read before "optimizing"):
 *  - levenshtein() is EXACT within maxDist (Ukkonen band + length short-
 *    circuit) and returns maxDist+1 beyond it. No full matrix, no per-row
 *    spread allocations like the legacy version.
 *  - Trigram Dice is a RANKING signal (order candidates, cut top-K), NEVER a
 *    correctness gate: dice==0 does NOT imply dist>2 (counterexample:
 *    "abcdef" vs "XbcYef" share no trigrams yet differ by 2 substitutions).
 *    rankFuzzy() therefore always verifies survivors with levenshtein().
 *  - All functions are total (null/invalid -> defined fallbacks), O(N)
 *    memory, and portable (no regex, no Node APIs).
 */

export const DEFAULT_MAX_TERM_LEN = 64 as const;

function capTerm(s: string, maxLen: number): string {
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

/**
 * Bounded Levenshtein distance. Exact when <= maxDist, otherwise maxDist+1.
 * Banded DP: O(min(n,m) * maxDist) time, O(min(n,m)) memory.
 */
export function levenshtein(
  a: string | null | undefined,
  b: string | null | undefined,
  maxDist = 2,
  maxLen: number = DEFAULT_MAX_TERM_LEN,
): number {
  const s = typeof a === 'string' ? capTerm(a, maxLen) : '';
  const t = typeof b === 'string' ? capTerm(b, maxLen) : '';
  const n = s.length;
  const m = t.length;
  if (Math.abs(n - m) > maxDist) return maxDist + 1; // sound length gate
  if (n === 0) return Math.min(m, maxDist + 1);
  if (m === 0) return Math.min(n, maxDist + 1);

  // Ensure the shorter string drives the row width.
  let str1 = s;
  let str2 = t;
  let len1 = n;
  let len2 = m;
  if (len1 > len2) {
    str1 = t;
    str2 = s;
    len1 = m;
    len2 = n;
  }

  let prev = new Array<number>(len1 + 1);
  let curr = new Array<number>(len1 + 1);
  for (let j = 0; j <= len1; j++) prev[j] = j;

  for (let i = 1; i <= len2; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const c2 = str2.charCodeAt(i - 1);
    // Band: |i - j| <= maxDist suffices for the bounded decision.
    const from = Math.max(1, i - maxDist);
    const to = Math.min(len1, i + maxDist);
    for (let j = 1; j < from; j++) curr[j] = maxDist + 1;
    for (let j = from; j <= to; j++) {
      const cost = str1.charCodeAt(j - 1) === c2 ? 0 : 1;
      const v = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      curr[j] = v;
      if (v < rowMin) rowMin = v;
    }
    for (let j = to + 1; j <= len1; j++) curr[j] = maxDist + 1;
    if (rowMin > maxDist) return maxDist + 1; // early exit
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[len1] > maxDist ? maxDist + 1 : prev[len1];
}

/**
 * Character-trigram multiset profile with edge padding ('  ab ').
 * Returned as a flat [trigram, count, ...] array for JSON/Rust portability
 * (Maps don't survive the napi boundary; order is insertion order).
 */
export function trigramProfile(text: string | null | undefined): string[] {
  if (typeof text !== 'string' || text.length === 0) return [];
  const lower = text.toLowerCase();
  const padded = `  ${lower} `;
  const counts = new Map<string, number>();
  for (let i = 0; i + 3 <= padded.length; i++) {
    const tri = padded.slice(i, i + 3);
    counts.set(tri, (counts.get(tri) ?? 0) + 1);
  }
  const flat: string[] = [];
  for (const [tri, count] of counts) {
    flat.push(tri, String(count));
  }
  return flat;
}

/** Dice coefficient over two flat trigram profiles (0..1). */
export function trigramDice(aFlat: readonly string[], bFlat: readonly string[]): number {
  if (aFlat.length === 0 || bFlat.length === 0) return 0;
  const bMap = new Map<string, number>();
  let bTotal = 0;
  for (let i = 0; i + 1 < bFlat.length; i += 2) {
    const count = Number(bFlat[i + 1]);
    bMap.set(bFlat[i], (bMap.get(bFlat[i]) ?? 0) + count);
    bTotal += count;
  }
  let aTotal = 0;
  let inter = 0;
  for (let i = 0; i + 1 < aFlat.length; i += 2) {
    const tri = aFlat[i];
    const count = Number(aFlat[i + 1]);
    aTotal += count;
    const have = bMap.get(tri) ?? 0;
    if (have > 0) {
      inter += Math.min(have, count);
      bMap.set(tri, have - Math.min(have, count));
    }
  }
  const denom = aTotal + bTotal;
  return denom === 0 ? 0 : (2 * inter) / denom;
}

export interface FuzzyMatch {
  readonly value: string;
  readonly dist: number;
  readonly trigram: number;
}

export interface RankFuzzyOptions {
  readonly maxDist?: number;
  readonly limit?: number;
  readonly maxLen?: number;
}

/**
 * Rank candidates by trigram Dice, verify with bounded Levenshtein, keep
 * dist <= maxDist. Sound: the trigram order never drops a true match —
 * cutoff applies ONLY to the verified distance.
 */
export function rankFuzzy(
  term: string | null | undefined,
  candidates: readonly string[],
  options?: RankFuzzyOptions,
): FuzzyMatch[] {
  const maxDist = options?.maxDist ?? 2;
  const limit = options?.limit ?? 10;
  const maxLen = options?.maxLen ?? DEFAULT_MAX_TERM_LEN;
  if (typeof term !== 'string' || term.length === 0 || candidates.length === 0) return [];
  const termProfile = trigramProfile(term);
  const scored: Array<{ value: string; dist: number; trigram: number; index: number }> = [];
  for (let i = 0; i < candidates.length; i++) {
    const value = candidates[i];
    if (typeof value !== 'string') continue;
    const tri = trigramDice(termProfile, trigramProfile(value));
    const dist = levenshtein(term, value, maxDist, maxLen);
    if (dist <= maxDist) scored.push({ value, dist, trigram: tri, index: i });
  }
  scored.sort((x, y) => y.trigram - x.trigram || x.dist - y.dist || x.index - y.index);
  return scored.slice(0, limit).map(({ value, dist, trigram }) => ({ value, dist, trigram }));
}
