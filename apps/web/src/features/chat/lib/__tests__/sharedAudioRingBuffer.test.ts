import { describe, it, expect } from 'vitest';
import { SharedAudioRingBuffer } from '../webrtc/sharedAudioRingBuffer';

describe('SharedAudioRingBuffer', () => {
  it('initializes with specified sample capacity and empty state', () => {
    const ring = SharedAudioRingBuffer.create(1024);
    expect(ring.capacity).toBe(1024);
    expect(ring.availableRead()).toBe(0);
    expect(ring.availableWrite()).toBe(1023);
  });

  it('writes and reads linear audio samples correctly', () => {
    const ring = SharedAudioRingBuffer.create(512);

    const input = new Float32Array([0.1, -0.2, 0.5, 0.99, -0.85]);
    const written = ring.write(input);
    expect(written).toBe(5);
    expect(ring.availableRead()).toBe(5);

    const output = new Float32Array(5);
    const read = ring.read(output);
    expect(read).toBe(5);
    expect(ring.availableRead()).toBe(0);

    for (let i = 0; i < input.length; i++) {
      expect(output[i]).toBeCloseTo(input[i], 5);
    }
  });

  it('correctly handles circular wrap-around at the buffer boundary', () => {
    const capacity = 16;
    const ring = SharedAudioRingBuffer.create(capacity);

    // Fill 10 samples
    const chunk1 = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    ring.write(chunk1);

    // Read 8 samples (advancing read pointer to 8)
    const out1 = new Float32Array(8);
    ring.read(out1);
    expect(ring.availableRead()).toBe(2);

    // Now write 10 more samples (should wrap around 16 back to 0)
    const chunk2 = new Float32Array([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    const written2 = ring.write(chunk2);
    expect(written2).toBe(10);
    expect(ring.availableRead()).toBe(12);

    // Read all 12 samples
    const out2 = new Float32Array(12);
    const read2 = ring.read(out2);
    expect(read2).toBe(12);

    expect(Array.from(out2)).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('prevents buffer overflow when writing beyond capacity', () => {
    const ring = SharedAudioRingBuffer.create(8);
    // Capacity 8 means max 7 samples before overflow
    const chunk = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const written = ring.write(chunk);
    expect(written).toBe(7);
    expect(ring.availableRead()).toBe(7);
    expect(ring.availableWrite()).toBe(0);

    const extraWrite = ring.write(new Float32Array([99]));
    expect(extraWrite).toBe(0);
  });

  it('performs high-throughput continuous stream without data corruption', () => {
    const ring = SharedAudioRingBuffer.create(256);
    const frameSize = 32;
    const iterations = 500;

    const inFrame = new Float32Array(frameSize);
    const outFrame = new Float32Array(frameSize);

    for (let iter = 0; iter < iterations; iter++) {
      for (let i = 0; i < frameSize; i++) {
        inFrame[i] = iter * 100 + i;
      }

      const w = ring.write(inFrame);
      expect(w).toBe(frameSize);

      const r = ring.read(outFrame);
      expect(r).toBe(frameSize);

      for (let i = 0; i < frameSize; i++) {
        expect(outFrame[i]).toBe(iter * 100 + i);
      }
    }
  });
});
