import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSocketStateBatch } from '../socketStateBatch';

describe('replaceable socket state batch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps only the latest state per key in a burst', () => {
    const received: Map<string, number>[] = [];
    const batch = createSocketStateBatch<number>((updates) => received.push(new Map(updates)));
    for (let i = 0; i < 100; i++) batch.enqueue('same user', () => i);
    expect(received).toHaveLength(0);
    vi.advanceTimersByTime(50);
    expect([...received[0]]).toEqual([['same user', 99]]);
    batch.dispose();
  });

  it('bounds distinct pending users without losing their final state', () => {
    const sizes: number[] = [];
    const all = new Map<string, number>();
    const batch = createSocketStateBatch<number>((updates) => {
      sizes.push(updates.size);
      updates.forEach((value, key) => all.set(key, value));
    });
    for (let i = 0; i < 1001; i++) batch.enqueue(`user-${i}`, () => i);
    expect(sizes).toEqual([500, 500]);
    vi.advanceTimersByTime(50);
    expect(sizes).toEqual([500, 500, 1]);
    expect(all.size).toBe(1001);
    expect(all.get('user-1000')).toBe(1000);
    batch.dispose();
  });

  it('disposes timers and refuses events from an old socket binding', () => {
    let publications = 0;
    const batch = createSocketStateBatch<boolean>(() => {
      publications += 1;
    });
    batch.enqueue('user', () => true);
    batch.dispose();
    batch.enqueue('user', () => false);
    vi.advanceTimersByTime(50);
    batch.flush();
    expect(publications).toBe(0);
  });
});
