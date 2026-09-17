/**
 * ArrayBuffer Recycle Pool (Memory Recycling)
 *
 * Eliminates V8 Garbage Collection (GC) pauses during high-frequency WebRTC
 * DataChannel binary transfers (screen annotations, laser coordinates, telemetry packets,
 * and chunked file fragments) by recycling pre-allocated ArrayBuffer instances.
 */

export const DEFAULT_POOL_BUCKETS = [64, 256, 1024, 4096, 16384, 65536] as const;

export interface BufferPoolStats {
  allocationsCount: number;
  reuseCount: number;
  releasedCount: number;
  hitRate: number; // 0.0 - 1.0
  activeBuffers: number;
  pooledBuffers: number;
  pooledBytes: number;
}

export class ArrayBufferRecyclePool {
  private readonly buckets: readonly number[];
  private readonly pools = new Map<number, ArrayBuffer[]>();
  private readonly maxPerBucket: number;

  private allocationsCount = 0;
  private reuseCount = 0;
  private releasedCount = 0;

  constructor(buckets: readonly number[] = DEFAULT_POOL_BUCKETS, maxPerBucket: number = 64) {
    this.buckets = [...buckets].sort((a, b) => a - b);
    this.maxPerBucket = maxPerBucket;

    for (const size of this.buckets) {
      this.pools.set(size, []);
    }
  }

  /**
   * Finds the smallest bucket capacity that satisfies the requested byte length
   */
  private findBucketSize(byteLength: number): number | null {
    for (let i = 0; i < this.buckets.length; i++) {
      const bucket = this.buckets[i];
      if (bucket >= byteLength) {
        return bucket;
      }
    }
    return null;
  }

  /**
   * Acquires a recycled Uint8Array buffer of at least the requested byte length.
   * If available, returns a pooled buffer (zero allocation).
   * Otherwise allocates a new ArrayBuffer of the appropriate bucket capacity.
   */
  public acquire(byteLength: number): Uint8Array<ArrayBuffer> {
    if (byteLength <= 0) {
      return new Uint8Array(new ArrayBuffer(0));
    }

    const bucketSize = this.findBucketSize(byteLength);

    if (bucketSize === null) {
      // Requested size is larger than maximum bucket capacity
      this.allocationsCount++;
      return new Uint8Array(new ArrayBuffer(byteLength));
    }

    const pool = this.pools.get(bucketSize);
    if (pool && pool.length > 0) {
      const buffer = pool.pop()!;
      this.reuseCount++;
      return new Uint8Array(buffer, 0, byteLength);
    }

    this.allocationsCount++;
    const newBuffer = new ArrayBuffer(bucketSize);
    return new Uint8Array(newBuffer, 0, byteLength);
  }

  /**
   * Returns a buffer back to the recycle pool for subsequent reuse
   */
  public release(target: Uint8Array | ArrayBuffer): void {
    const buffer =
      target instanceof ArrayBuffer
        ? target
        : target.buffer instanceof ArrayBuffer
          ? target.buffer
          : null;

    if (!buffer || buffer.byteLength === 0) return;

    const pool = this.pools.get(buffer.byteLength);
    if (pool && pool.length < this.maxPerBucket) {
      pool.push(buffer);
      this.releasedCount++;
    }
  }

  /**
   * Returns live diagnostic metrics for telemetry and memory profiling
   */
  public getStats(): BufferPoolStats {
    let pooledBuffers = 0;
    let pooledBytes = 0;

    this.pools.forEach((buffers, size) => {
      pooledBuffers += buffers.length;
      pooledBytes += buffers.length * size;
    });

    const totalRequests = this.allocationsCount + this.reuseCount;
    const hitRate = totalRequests > 0 ? this.reuseCount / totalRequests : 0;
    const activeBuffers = Math.max(
      0,
      this.allocationsCount - this.releasedCount + (this.reuseCount - this.releasedCount),
    );

    return {
      allocationsCount: this.allocationsCount,
      reuseCount: this.reuseCount,
      releasedCount: this.releasedCount,
      hitRate,
      activeBuffers,
      pooledBuffers,
      pooledBytes,
    };
  }

  /**
   * Releases all pooled ArrayBuffers, freeing V8 heap references
   */
  public clear(): void {
    this.pools.forEach((pool) => {
      pool.length = 0;
    });
  }
}

export const globalBufferPool = new ArrayBufferRecyclePool();
