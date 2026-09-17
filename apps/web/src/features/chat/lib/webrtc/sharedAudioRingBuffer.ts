/**
 * SharedArrayBuffer & Atomics Lock-Free Circular Audio Ring Buffer
 *
 * Implements zero-copy, zero-GC jitter audio frame passing between
 * AudioWorklet rendering thread, Web Workers, and WASM DSP modules.
 */

export const HEADER_FIELDS = {
  WRITE_INDEX: 0,
  READ_INDEX: 1,
  CAPACITY: 2,
  FLAGS: 3,
} as const;

export const HEADER_SIZE_BYTES = 16; // 4 int32 fields * 4 bytes

export function isSharedArrayBufferSupported(): boolean {
  return (
    typeof SharedArrayBuffer !== 'undefined' &&
    typeof Atomics !== 'undefined' &&
    typeof Atomics.wait === 'function'
  );
}

export class SharedAudioRingBuffer {
  public readonly isShared: boolean;
  public readonly buffer: SharedArrayBuffer | ArrayBuffer;
  private readonly header: Int32Array;
  private readonly payload: Float32Array;
  public readonly capacity: number;

  constructor(buffer: SharedArrayBuffer | ArrayBuffer, capacity: number) {
    this.buffer = buffer;
    this.isShared = typeof SharedArrayBuffer !== 'undefined' && buffer instanceof SharedArrayBuffer;
    this.header = new Int32Array(buffer, 0, 4);
    this.capacity = capacity;
    this.payload = new Float32Array(buffer, HEADER_SIZE_BYTES, capacity);
  }

  /**
   * Allocates a new SharedAudioRingBuffer with the given sample capacity.
   * If SharedArrayBuffer is unavailable (e.g. strict cross-origin isolation missing),
   * falls back to a standard ArrayBuffer.
   */
  public static create(sampleCapacity: number = 16384): SharedAudioRingBuffer {
    const totalBytes = HEADER_SIZE_BYTES + sampleCapacity * Float32Array.BYTES_PER_ELEMENT;
    let buf: SharedArrayBuffer | ArrayBuffer;

    if (typeof SharedArrayBuffer !== 'undefined') {
      try {
        buf = new SharedArrayBuffer(totalBytes);
      } catch {
        buf = new ArrayBuffer(totalBytes);
      }
    } else {
      buf = new ArrayBuffer(totalBytes);
    }

    const ring = new SharedAudioRingBuffer(buf, sampleCapacity);
    ring.initHeader(sampleCapacity);
    return ring;
  }

  /**
   * Creates a ring buffer instance from an existing shared memory buffer (e.g. received via postMessage)
   */
  public static fromBuffer(buffer: SharedArrayBuffer | ArrayBuffer): SharedAudioRingBuffer {
    const header = new Int32Array(buffer, 0, 4);
    const capacity = Atomics.load(header, HEADER_FIELDS.CAPACITY) || 16384;
    return new SharedAudioRingBuffer(buffer, capacity);
  }

  private initHeader(capacity: number): void {
    if (this.isShared) {
      Atomics.store(this.header, HEADER_FIELDS.WRITE_INDEX, 0);
      Atomics.store(this.header, HEADER_FIELDS.READ_INDEX, 0);
      Atomics.store(this.header, HEADER_FIELDS.CAPACITY, capacity);
      Atomics.store(this.header, HEADER_FIELDS.FLAGS, 1); // 1 = Active
    } else {
      this.header[HEADER_FIELDS.WRITE_INDEX] = 0;
      this.header[HEADER_FIELDS.READ_INDEX] = 0;
      this.header[HEADER_FIELDS.CAPACITY] = capacity;
      this.header[HEADER_FIELDS.FLAGS] = 1;
    }
  }

  /**
   * Number of unread samples currently available in the ring buffer
   */
  public availableRead(): number {
    const write = this.isShared
      ? Atomics.load(this.header, HEADER_FIELDS.WRITE_INDEX)
      : this.header[HEADER_FIELDS.WRITE_INDEX];
    const read = this.isShared
      ? Atomics.load(this.header, HEADER_FIELDS.READ_INDEX)
      : this.header[HEADER_FIELDS.READ_INDEX];

    return (write - read + this.capacity) % this.capacity;
  }

  /**
   * Number of samples that can be written before buffer overflows
   */
  public availableWrite(): number {
    return this.capacity - 1 - this.availableRead();
  }

  /**
   * Writes raw audio samples into the ring buffer with zero object allocation
   * @param samples Source audio samples
   * @returns Number of samples successfully written
   */
  public write(samples: Float32Array): number {
    const toWrite = Math.min(samples.length, this.availableWrite());
    if (toWrite <= 0) return 0;

    const writePtr = this.isShared
      ? Atomics.load(this.header, HEADER_FIELDS.WRITE_INDEX)
      : this.header[HEADER_FIELDS.WRITE_INDEX];

    const firstChunk = Math.min(toWrite, this.capacity - writePtr);
    this.payload.set(samples.subarray(0, firstChunk), writePtr);

    if (toWrite > firstChunk) {
      this.payload.set(samples.subarray(firstChunk, toWrite), 0);
    }

    const nextWrite = (writePtr + toWrite) % this.capacity;

    if (this.isShared) {
      Atomics.store(this.header, HEADER_FIELDS.WRITE_INDEX, nextWrite);
      Atomics.notify(this.header, HEADER_FIELDS.WRITE_INDEX, 1);
    } else {
      this.header[HEADER_FIELDS.WRITE_INDEX] = nextWrite;
    }

    return toWrite;
  }

  /**
   * Reads available samples from the ring buffer into target array with zero object allocation
   * @param outBuffer Destination array
   * @returns Number of samples read
   */
  public read(outBuffer: Float32Array): number {
    const toRead = Math.min(outBuffer.length, this.availableRead());
    if (toRead <= 0) return 0;

    const readPtr = this.isShared
      ? Atomics.load(this.header, HEADER_FIELDS.READ_INDEX)
      : this.header[HEADER_FIELDS.READ_INDEX];

    const firstChunk = Math.min(toRead, this.capacity - readPtr);
    outBuffer.set(this.payload.subarray(readPtr, readPtr + firstChunk), 0);

    if (toRead > firstChunk) {
      const secondChunk = toRead - firstChunk;
      outBuffer.set(this.payload.subarray(0, secondChunk), firstChunk);
    }

    const nextRead = (readPtr + toRead) % this.capacity;

    if (this.isShared) {
      Atomics.store(this.header, HEADER_FIELDS.READ_INDEX, nextRead);
      Atomics.notify(this.header, HEADER_FIELDS.READ_INDEX, 1);
    } else {
      this.header[HEADER_FIELDS.READ_INDEX] = nextRead;
    }

    return toRead;
  }

  /**
   * Waits for data to be available (useful inside Web Workers / AudioWorklets)
   * Note: Atomics.wait will throw on main window thread if invoked there.
   */
  public wait(timeoutMs: number = 20): 'ok' | 'not-equal' | 'timed-out' | 'unsupported' {
    if (!this.isShared || typeof Atomics.wait !== 'function') return 'unsupported';
    try {
      const currentWrite = Atomics.load(this.header, HEADER_FIELDS.WRITE_INDEX);
      const currentRead = Atomics.load(this.header, HEADER_FIELDS.READ_INDEX);
      if (currentWrite !== currentRead) return 'not-equal';
      return Atomics.wait(this.header, HEADER_FIELDS.WRITE_INDEX, currentWrite, timeoutMs);
    } catch {
      return 'unsupported';
    }
  }

  /**
   * Clears buffer pointers
   */
  public reset(): void {
    if (this.isShared) {
      Atomics.store(this.header, HEADER_FIELDS.WRITE_INDEX, 0);
      Atomics.store(this.header, HEADER_FIELDS.READ_INDEX, 0);
    } else {
      this.header[HEADER_FIELDS.WRITE_INDEX] = 0;
      this.header[HEADER_FIELDS.READ_INDEX] = 0;
    }
  }
}
