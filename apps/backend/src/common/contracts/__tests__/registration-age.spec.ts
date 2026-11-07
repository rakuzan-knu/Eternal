import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calendarBirthDate, registrationBirthDateError, registerSchema } from '../auth';

describe('registration age boundary', () => {
  afterEach(() => vi.useRealTimers());

  it('keeps the shared and backend calendar rule identical', () => {
    const shared = readFileSync(
      resolve(__dirname, '../../../../../../packages/shared/contracts/src/registration-age.ts'),
      'utf8',
    );
    const backend = readFileSync(resolve(__dirname, '../registration-age.ts'), 'utf8');
    expect(shared.replace(/\r\n/g, '\n')).toBe(backend.replace(/\r\n/g, '\n'));
  });

  it.each([undefined, null, '', 'not-a-date', new Date('invalid'), '2012-02-30T00:00:00.000Z'])(
    'rejects missing or invalid birthday %s',
    (birthday) => {
      expect(registrationBirthDateError(birthday, new Date('2026-11-05T00:00:00.000Z'))).toBe(
        'Select a valid birthday',
      );
    },
  );

  it('admits on the thirteenth calendar birthday, not the previous day', () => {
    const birthDate = '2013-11-05T23:59:59.999Z';
    expect(registrationBirthDateError(birthDate, new Date('2026-11-04T23:59:59.999Z'))).toContain(
      'at least 13',
    );
    expect(registrationBirthDateError(birthDate, new Date('2026-11-05T00:00:00.000Z'))).toBeNull();
  });

  it('treats a leap-day birthday conservatively until March in a non-leap year', () => {
    expect(
      registrationBirthDateError('2012-02-29T00:00:00.000Z', new Date('2025-02-28T23:59:59Z')),
    ).toContain('at least 13');
    expect(
      registrationBirthDateError('2012-02-29T00:00:00.000Z', new Date('2025-03-01T00:00:00Z')),
    ).toBeNull();
  });

  it('rejects future dates before calculating eligibility', () => {
    expect(
      registrationBirthDateError('2026-11-06T00:00:00.000Z', new Date('2026-11-05T23:59:59Z')),
    ).toBe('Birthday cannot be in the future');
  });

  it('constructs the selected date at UTC midnight without local timezone shifts', () => {
    expect(calendarBirthDate(2000, 1, 29)?.toISOString()).toBe('2000-02-29T00:00:00.000Z');
    expect(calendarBirthDate(2001, 1, 29)).toBeNull();
    expect(calendarBirthDate(2000, 12, 1)).toBeNull();
    expect(calendarBirthDate(2000, 0, 0)).toBeNull();
    expect(calendarBirthDate(99, 0, 1)?.getUTCFullYear()).toBe(99);
    const birthDate = '2013-11-05T00:00:00.000Z';
    expect(registrationBirthDateError(birthDate, new Date('2026-11-05T14:00:00+14:00'))).toBeNull();
    expect(registrationBirthDateError(birthDate, new Date('2026-11-04T10:00:00-14:00'))).toBeNull();
  });

  it('requires a valid eligible birthday in the backend register contract', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-05T00:00:00.000Z'));
    const payload = { email: 'test@example.com', username: 'test_user', password: 'Password123!' };
    expect(registerSchema.safeParse(payload).success).toBe(false);
    expect(
      registerSchema.safeParse({ ...payload, birthDate: '2013-11-06T00:00:00.000Z' }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ ...payload, birthDate: '2013-11-05T00:00:00.000Z' }).success,
    ).toBe(true);
  });
});
