import { expect, it } from 'vitest';
import { activeLyricIndex } from './lyrics';
it('follows timed lyrics and resolves a seek backwards without selecting a future line', () => {
  const lines = [{ timeMs: 1000 }, { timeMs: 3000 }, { timeMs: 5000 }];
  expect(activeLyricIndex(lines, 0, true)).toBe(-1);
  expect(activeLyricIndex(lines, 3200, true)).toBe(1);
  expect(activeLyricIndex(lines, 7000, true)).toBe(2);
  expect(activeLyricIndex(lines, 1200, true)).toBe(0);
});
it('never treats plain lyrics or an empty result as karaoke', () => {
  expect(activeLyricIndex([{ timeMs: 0 }, { timeMs: 0 }], 10000, false)).toBe(-1);
  expect(activeLyricIndex([], 1000, true)).toBe(-1);
});
