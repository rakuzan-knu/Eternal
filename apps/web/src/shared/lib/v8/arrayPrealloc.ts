/**
 * Frontend V8 Array Pre-allocation Utilities
 *
 * Prevents V8 from continually reallocating heap memory buffers during
 * list transformations and UI array generation (2 -> 4 -> 8 -> 16 -> ...).
 */

export function preallocateArray<T>(length: number): T[] {
  const smiLen = Math.max(0, length | 0);
  return new Array<T>(smiLen);
}

export function fastMap<T, R>(items: readonly T[], fn: (item: T, index: number) => R): R[] {
  const len = items.length;
  const result = new Array<R>(len);
  for (let i = 0; i < len; i++) {
    result[i] = fn(items[i], i);
  }
  return result;
}

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
