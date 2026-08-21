import { AutoDeletePeriod } from '@prisma/client';
import { cutoffFor, AUTO_DELETE_INTERVAL_MS } from '../auto-delete.util';

describe('auto-delete.util', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;

  it('defines correct millisecond intervals for each period', () => {
    expect(AUTO_DELETE_INTERVAL_MS.DAY).toBe(DAY_MS);
    expect(AUTO_DELETE_INTERVAL_MS.WEEK).toBe(7 * DAY_MS);
    expect(AUTO_DELETE_INTERVAL_MS.MONTH).toBe(30 * DAY_MS);
    expect(AUTO_DELETE_INTERVAL_MS.QUARTER).toBe(90 * DAY_MS);
  });

  describe('cutoffFor', () => {
    const fixedNow = 1700000000000;

    it('returns null when period is OFF', () => {
      expect(cutoffFor(AutoDeletePeriod.OFF, fixedNow)).toBeNull();
    });

    it('calculates cutoff date for DAY', () => {
      const expected = new Date(fixedNow - DAY_MS);
      expect(cutoffFor(AutoDeletePeriod.DAY, fixedNow)).toEqual(expected);
    });

    it('calculates cutoff date for WEEK', () => {
      const expected = new Date(fixedNow - 7 * DAY_MS);
      expect(cutoffFor(AutoDeletePeriod.WEEK, fixedNow)).toEqual(expected);
    });

    it('calculates cutoff date for MONTH', () => {
      const expected = new Date(fixedNow - 30 * DAY_MS);
      expect(cutoffFor(AutoDeletePeriod.MONTH, fixedNow)).toEqual(expected);
    });

    it('calculates cutoff date for QUARTER', () => {
      const expected = new Date(fixedNow - 90 * DAY_MS);
      expect(cutoffFor(AutoDeletePeriod.QUARTER, fixedNow)).toEqual(expected);
    });
  });
});
