/**
 * V8 Array Pre-allocation Utilities
 *
 * When an array is built incrementally via `arr.push()`, V8 dynamically reallocates
 * the backing store as the array grows: 2 -> 4 -> 8 -> 16 -> 32 -> ...
 * Each reallocation allocates a new memory chunk on the V8 heap and discards the old one,
 * which generates garbage and triggers minor GC cycles (Scavenge).
 *
 * When the size of an output collection is known upfront (e.g. pagination limit, input length),
 * pre-allocating with `new Array(length)` reserves the exact buffer once, eliminating reallocations.
 */

/**
 * Creates a pre-allocated array of the given fixed length.
 * Coerces length to non-negative Smi (32-bit signed integer).
 */
export function preallocateArray<T>(length: number): T[] {
  const smiLen = Math.max(0, length | 0);
  return new Array<T>(smiLen);
}

/**
 * Fast mapping that transforms an array using a single pre-allocated output buffer.
 * Significantly faster than `Array.prototype.map()` in hot paths because:
 *  1. Avoids intermediate callback stack frame optimizations overhead.
 *  2. Allocates exact output capacity upfront without dynamic expansion.
 */
export function fastMap<T, R>(items: readonly T[], fn: (item: T, index: number) => R): R[] {
  const len = items.length;
  const result = new Array<R>(len);
  for (let i = 0; i < len; i++) {
    result[i] = fn(items[i], i);
  }
  return result;
}

/**
 * Fast filter-map that pre-allocates an upper-bound buffer and trims length at the end.
 * If the predicate returns `null` or `undefined`, the item is omitted.
 * Performs at most one array allocation instead of two (filter + map).
 */
export function fastFilterMap<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => R | null | undefined,
): R[] {
  const len = items.length;
  const result = new Array<R>(len);
  let count = 0;

  for (let i = 0; i < len; i++) {
    const mapped = fn(items[i], i);
    if (mapped !== null && mapped !== undefined) {
      result[count++] = mapped;
    }
  }

  result.length = count;
  return result;
}
