import { LastSeenGranularity } from '@common/contracts';

const DAY_MS = 24 * 60 * 60 * 1000;

export function toLastSeenGranularity(lastSeenAt: Date, now: number): LastSeenGranularity {
  const age = now - lastSeenAt.getTime();
  if (age <= 3 * DAY_MS) return LastSeenGranularity.RECENTLY;
  if (age <= 7 * DAY_MS) return LastSeenGranularity.WITHIN_WEEK;
  if (age <= 30 * DAY_MS) return LastSeenGranularity.WITHIN_MONTH;
  return LastSeenGranularity.LONG_AGO;
}
