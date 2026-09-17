import { WriteCoalescer } from '../write-coalescer';

describe('WriteCoalescer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('enqueues items and flushes when interval timer fires', async () => {
    const flushHandler = jest.fn().mockResolvedValue(undefined);
    const coalescer = new WriteCoalescer<string, number>({
      flushIntervalMs: 200,
      flushHandler,
      mergeFn: (existing = 0, incoming) => existing + incoming,
    });

    coalescer.enqueue('key1', 5);
    coalescer.enqueue('key2', 10);
    coalescer.enqueue('key1', 3);

    expect(coalescer.size).toBe(2);
    expect(flushHandler).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    await Promise.resolve();

    expect(flushHandler).toHaveBeenCalledTimes(1);
    const [[batchArg]] = flushHandler.mock.calls as [[Map<string, number>]];
    expect(batchArg.get('key1')).toBe(8);
    expect(batchArg.get('key2')).toBe(10);
    expect(coalescer.size).toBe(0);

    await coalescer.stop();
  });

  it('flushes immediately when buffer reaches maxBatchSize', async () => {
    const flushHandler = jest.fn().mockResolvedValue(undefined);
    const coalescer = new WriteCoalescer<string, string>({
      flushIntervalMs: 5000,
      maxBatchSize: 3,
      flushHandler,
    });

    coalescer.enqueue('k1', 'v1');
    coalescer.enqueue('k2', 'v2');
    expect(flushHandler).not.toHaveBeenCalled();

    coalescer.enqueue('k3', 'v3');
    await Promise.resolve();

    expect(flushHandler).toHaveBeenCalledTimes(1);
    await coalescer.stop();
  });

  it('re-queues non-conflicting items if flush fails', async () => {
    let callCount = 0;
    const flushHandler = jest.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error('Database connection failed');
      }
    });

    const coalescer = new WriteCoalescer<string, string>({
      flushIntervalMs: 100,
      flushHandler,
    });

    coalescer.enqueue('k1', 'v1');
    await coalescer.flush();

    expect(flushHandler).toHaveBeenCalledTimes(1);
    expect(coalescer.size).toBe(1);

    await coalescer.flush();
    expect(flushHandler).toHaveBeenCalledTimes(2);
    expect(coalescer.size).toBe(0);

    await coalescer.stop();
  });

  it('flushes remaining buffer on stop()', async () => {
    const flushHandler = jest.fn().mockResolvedValue(undefined);
    const coalescer = new WriteCoalescer<string, number>({
      flushIntervalMs: 1000,
      flushHandler,
    });

    coalescer.enqueue('k1', 100);
    await coalescer.stop();

    expect(flushHandler).toHaveBeenCalledTimes(1);
    expect(coalescer.size).toBe(0);
  });
});
