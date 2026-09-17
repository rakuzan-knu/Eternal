import { describe, it, expect, beforeEach } from 'vitest';
import { ArrayBufferRecyclePool } from '../arrayBufferPool';

describe('ArrayBufferRecyclePool (Memory Recycling)', () => {
  let pool: ArrayBufferRecyclePool;

  beforeEach(() => {
    pool = new ArrayBufferRecyclePool([64, 256, 1024], 4);
  });

  it('allocates new buffer on first request and tracks stats', () => {
    const buf = pool.acquire(48);
    expect(buf.byteLength).toBe(48);
    expect(buf.buffer.byteLength).toBe(64); // bucket 64

    const stats = pool.getStats();
    expect(stats.allocationsCount).toBe(1);
    expect(stats.reuseCount).toBe(0);
    expect(stats.hitRate).toBe(0);
  });

  it('recycles released buffer and achieves high hit rate', () => {
    const buf1 = pool.acquire(100); // bucket 256
    expect(buf1.buffer.byteLength).toBe(256);

    pool.release(buf1);
    let stats = pool.getStats();
    expect(stats.pooledBuffers).toBe(1);
    expect(stats.releasedCount).toBe(1);

    // Second acquire should reuse the same underlying ArrayBuffer
    const buf2 = pool.acquire(150);
    expect(buf2.buffer.byteLength).toBe(256);
    expect(buf2.buffer).toBe(buf1.buffer);

    stats = pool.getStats();
    expect(stats.allocationsCount).toBe(1);
    expect(stats.reuseCount).toBe(1);
    expect(stats.hitRate).toBe(0.5); // 1 reuse / 2 requests
    expect(stats.pooledBuffers).toBe(0);
  });

  it('handles requests larger than maximum bucket capacity gracefully', () => {
    const largeBuf = pool.acquire(4096);
    expect(largeBuf.byteLength).toBe(4096);
    expect(largeBuf.buffer.byteLength).toBe(4096);

    const stats = pool.getStats();
    expect(stats.allocationsCount).toBe(1);

    // Releasing oversized buffer is safely ignored (not pooled)
    pool.release(largeBuf);
    expect(pool.getStats().pooledBuffers).toBe(0);
  });

  it('respects maxPerBucket capacity and clears buffers', () => {
    const buffers = [
      pool.acquire(30),
      pool.acquire(30),
      pool.acquire(30),
      pool.acquire(30),
      pool.acquire(30),
    ];

    buffers.forEach((b) => pool.release(b));
    // maxPerBucket is 4
    expect(pool.getStats().pooledBuffers).toBe(4);

    pool.clear();
    expect(pool.getStats().pooledBuffers).toBe(0);
  });
});
