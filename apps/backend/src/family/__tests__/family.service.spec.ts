import { describe, it, expect } from 'vitest';
import { calculateAgeFromBirthDate } from '../family.service';
import { isCurrentTimeInCurfew } from '../family-safeguard.service';

describe('Family date calculations', () => {
  it('calculates completed age and defaults missing data to adult for display only', () => {
    expect(
      calculateAgeFromBirthDate(new Date(Date.UTC(new Date().getUTCFullYear() - 15, 0, 1))),
    ).toBe(15);
    expect(calculateAgeFromBirthDate(null)).toBe(24);
  });
  it('checks overnight and daytime curfews in the configured timezone', () => {
    expect(
      isCurrentTimeInCurfew('22:00', '07:00', 'Europe/Kyiv', new Date('2026-09-20T20:30:00Z')),
    ).toBe(true);
    expect(
      isCurrentTimeInCurfew('22:00', '07:00', 'Europe/Kyiv', new Date('2026-09-20T11:00:00Z')),
    ).toBe(false);
    expect(isCurrentTimeInCurfew('09:00', '17:00', 'UTC', new Date('2026-09-20T11:00:00Z'))).toBe(
      true,
    );
    expect(isCurrentTimeInCurfew('22:00', '07:00', 'invalid', new Date())).toBe(false);
  });
});
