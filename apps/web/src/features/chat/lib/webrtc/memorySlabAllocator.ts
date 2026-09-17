/**
 * Zero-GC Memory Slab Allocator
 *
 * Pre-allocates a contiguous 16 MB ArrayBuffer pool and partitions it
 * via an aligned circular bump-pointer allocator to eliminate V8 heap
 * allocations and avoid Garbage Collection pauses in high-frequency WebRTC streams.
 */

export const SLAB_POOL_SIZE_BYTES = 16 * 1024 * 1024; // 16 Megabytes

export class MemorySlabAllocator {
  private readonly buffer: ArrayBuffer;
  private currentOffset = 0;
  private allocationsCount = 0;
  private wrapCount = 0;

  constructor(sizeBytes: number = SLAB_POOL_SIZE_BYTES) {
    this.buffer = new ArrayBuffer(sizeBytes);
  }

  /**
   * Allocates a typed view of the specified byte size from the slab.
   * Uses 4-byte word alignment and circular pointer wrapping.
   */
  public allocate(sizeBytes: number): Uint8Array {
    if (sizeBytes > this.buffer.byteLength) {
      throw new Error(
        `Requested allocation size ${sizeBytes} exceeds total slab capacity ${this.buffer.byteLength}`,
      );
    }

    // Align to 4 bytes
    const alignedOffset = (this.currentOffset + 3) & ~3;

    // Check if allocation fits in remaining buffer space; if not, wrap to 0
    if (alignedOffset + sizeBytes > this.buffer.byteLength) {
      this.currentOffset = 0;
      this.wrapCount++;
    } else {
      this.currentOffset = alignedOffset;
    }

    const view = new Uint8Array(this.buffer, this.currentOffset, sizeBytes);
    this.currentOffset += sizeBytes;
    this.allocationsCount++;

    return view;
  }

  /**
   * Copies source byte array into a newly allocated slab view without garbage collection
   */
  public copyIntoSlab(src: Uint8Array): Uint8Array {
    const slab = this.allocate(src.byteLength);
    slab.set(src);
    return slab;
  }

  /**
   * Clears the bump pointer back to beginning of the slab pool
   */
  public reset(): void {
    this.currentOffset = 0;
  }

  /**
   * Telemetry stats on allocations and memory utilization
   */
  public getStats() {
    return {
      capacityBytes: this.buffer.byteLength,
      currentOffset: this.currentOffset,
      allocationsCount: this.allocationsCount,
      wrapCount: this.wrapCount,
      utilizationRatio: this.currentOffset / this.buffer.byteLength,
    };
  }
}

// Global singleton instance for WebRTC data processing
export const globalSlabAllocator = new MemorySlabAllocator();
