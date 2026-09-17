import { LastSeenGranularity } from '@common/contracts';
import { toLastSeenGranularity } from '../last-seen.util';

describe('toLastSeenGranularity', () => {
  const now = new Date('2026-08-16T12:00:00.000Z').getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;

  it('returns RECENTLY for activity within 3 days', () => {
    const exactlyNow = new Date(now);
    const oneDayAgo = new Date(now - DAY_MS);
    const threeDaysAgo = new Date(now - 3 * DAY_MS);

    expect(toLastSeenGranularity(exactlyNow, now)).toBe(LastSeenGranularity.RECENTLY);
    expect(toLastSeenGranularity(oneDayAgo, now)).toBe(LastSeenGranularity.RECENTLY);
    expect(toLastSeenGranularity(threeDaysAgo, now)).toBe(LastSeenGranularity.RECENTLY);
  });

  it('returns WITHIN_WEEK for activity between 3 and 7 days ago', () => {
    const fourDaysAgo = new Date(now - 4 * DAY_MS);
    const sevenDaysAgo = new Date(now - 7 * DAY_MS);

    expect(toLastSeenGranularity(fourDaysAgo, now)).toBe(LastSeenGranularity.WITHIN_WEEK);
    expect(toLastSeenGranularity(sevenDaysAgo, now)).toBe(LastSeenGranularity.WITHIN_WEEK);
  });

  it('returns WITHIN_MONTH for activity between 7 and 30 days ago', () => {
    const eightDaysAgo = new Date(now - 8 * DAY_MS);
    const thirtyDaysAgo = new Date(now - 30 * DAY_MS);

    expect(toLastSeenGranularity(eightDaysAgo, now)).toBe(LastSeenGranularity.WITHIN_MONTH);
    expect(toLastSeenGranularity(thirtyDaysAgo, now)).toBe(LastSeenGranularity.WITHIN_MONTH);
  });

  it('returns LONG_AGO for activity older than 30 days', () => {
    const thirtyOneDaysAgo = new Date(now - 31 * DAY_MS);
    const yearAgo = new Date(now - 365 * DAY_MS);

    expect(toLastSeenGranularity(thirtyOneDaysAgo, now)).toBe(LastSeenGranularity.LONG_AGO);
    expect(toLastSeenGranularity(yearAgo, now)).toBe(LastSeenGranularity.LONG_AGO);
  });
});
