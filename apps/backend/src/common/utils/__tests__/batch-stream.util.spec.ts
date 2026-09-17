import {
  chunkArray,
  batchProcess,
  cursorStream,
  chunkQuery,
  DEFAULT_CHUNK_SIZE,
} from '../batch-stream.util';

describe('batch-stream.util', () => {
  describe('chunkArray', () => {
    it('returns empty array for empty input', () => {
      expect(chunkArray([])).toEqual([]);
      expect(chunkArray(null as unknown as readonly unknown[])).toEqual([]);
    });

    it('chunks array into expected batch sizes', () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const chunks = chunkArray(items, 3);
      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('defaults to DEFAULT_CHUNK_SIZE (500)', () => {
      const items = Array.from({ length: 1200 }, (_, i) => i);
      const chunks = chunkArray(items);
      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(DEFAULT_CHUNK_SIZE);
      expect(chunks[1].length).toBe(DEFAULT_CHUNK_SIZE);
      expect(chunks[2].length).toBe(200);
    });
  });

  describe('batchProcess', () => {
    it('processes items in chunks and concatenates results', async () => {
      const items = [1, 2, 3, 4, 5];
      const processed = await batchProcess(items, 2, async (chunk) => {
        return chunk.map((n) => n * 10);
      });
      expect(processed).toEqual([10, 20, 30, 40, 50]);
    });

    it('handles empty input gracefully', async () => {
      const processed = await batchProcess([], 10, async (chunk) => chunk);
      expect(processed).toEqual([]);
    });
  });

  describe('cursorStream', () => {
    it('streams items across multiple pages', async () => {
      const data = [
        { id: 'a', val: 1 },
        { id: 'b', val: 2 },
        { id: 'c', val: 3 },
        { id: 'd', val: 4 },
        { id: 'e', val: 5 },
      ];

      const fetcher = jest.fn((cursor?: string, take?: number): Promise<typeof data> => {
        const limit = take ?? 2;
        const startIndex = cursor ? data.findIndex((d) => d.id === cursor) + 1 : 0;
        return Promise.resolve(data.slice(startIndex, startIndex + limit));
      });

      const collected: typeof data = [];
      for await (const item of cursorStream({
        fetcher,
        getCursor: (item) => item.id,
        chunkSize: 2,
      })) {
        collected.push(item);
      }

      expect(collected).toEqual(data);
      expect(fetcher).toHaveBeenCalledTimes(3); // [a, b], [c, d], [e]
    });
  });

  describe('chunkQuery', () => {
    it('queries using skip/take and executes handler per batch', async () => {
      const allData = Array.from({ length: 15 }, (_, i) => i);
      const receivedBatches: number[][] = [];

      const total = await chunkQuery({
        fetcher: async (skip, take) => allData.slice(skip, skip + take),
        chunkSize: 5,
        handler: async (batch) => {
          receivedBatches.push(batch);
        },
      });

      expect(total).toBe(15);
      expect(receivedBatches.length).toBe(3);
      expect(receivedBatches[0]).toEqual([0, 1, 2, 3, 4]);
      expect(receivedBatches[1]).toEqual([5, 6, 7, 8, 9]);
      expect(receivedBatches[2]).toEqual([10, 11, 12, 13, 14]);
    });
  });
});
