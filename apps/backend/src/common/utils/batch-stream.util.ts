/**
 * Enterprise batch, chunking and streaming utilities for OOM protection.
 * Ensures large database collections and array operations never overwhelm heap memory.
 */

export const DEFAULT_CHUNK_SIZE = 500;

/**
 * Splits an array into chunks of maximum `chunkSize` elements.
 */
export function chunkArray<T>(items: readonly T[], chunkSize = DEFAULT_CHUNK_SIZE): T[][] {
  if (!items || items.length === 0) return [];
  const safeSize = Math.max(1, chunkSize);
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += safeSize) {
    chunks.push(items.slice(i, i + safeSize));
  }
  return chunks;
}

/**
 * Processes an in-memory array in batches of `chunkSize` using an async handler.
 */
export async function batchProcess<T, R>(
  items: readonly T[],
  chunkSize: number,
  handler: (chunk: T[]) => Promise<R[]>,
): Promise<R[]> {
  if (!items || items.length === 0) return [];
  const chunks = chunkArray(items, chunkSize);
  const results: R[] = [];

  for (const chunk of chunks) {
    const chunkResult = await handler(chunk);
    if (Array.isArray(chunkResult)) {
      results.push(...chunkResult);
    }
  }

  return results;
}

/**
 * Iterates through a database query or external resource in batches using cursor-based streaming.
 */
export async function* cursorStream<T, C>(options: {
  fetcher: (cursor?: C, take?: number) => Promise<T[]>;
  getCursor: (item: T) => C;
  chunkSize?: number;
}): AsyncIterable<T> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  let currentCursor: C | undefined = undefined;

  while (true) {
    const batch = await options.fetcher(currentCursor, chunkSize);
    if (!batch || batch.length === 0) {
      break;
    }

    for (const item of batch) {
      yield item;
    }

    if (batch.length < chunkSize) {
      break;
    }

    const lastItem = batch[batch.length - 1];
    currentCursor = options.getCursor(lastItem);
  }
}

/**
 * Executes a paginated query in chunks using offset/skip and processes each chunk with a handler.
 */
export async function chunkQuery<T>(options: {
  fetcher: (skip: number, take: number) => Promise<T[]>;
  chunkSize?: number;
  handler: (batch: T[]) => Promise<void>;
}): Promise<number> {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  let skip = 0;
  let totalProcessed = 0;

  while (true) {
    const batch = await options.fetcher(skip, chunkSize);
    if (!batch || batch.length === 0) {
      break;
    }

    await options.handler(batch);
    totalProcessed += batch.length;

    if (batch.length < chunkSize) {
      break;
    }

    skip += chunkSize;
  }

  return totalProcessed;
}
