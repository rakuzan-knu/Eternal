export const MINIMUM_REGISTRATION_AGE = 13;

export function registrationAgeBand(
  birthDate: Date,
  now = new Date(),
): 'UNDER_13' | 'AGE_13' | 'AGE_14_17' | 'ADULT' | 'UNKNOWN' {
  if (!Number.isFinite(birthDate.getTime()) || !Number.isFinite(now.getTime())) return 'UNKNOWN';
  const birthdayPending =
    now.getUTCMonth() < birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate());
  const age = now.getUTCFullYear() - birthDate.getUTCFullYear() - (birthdayPending ? 1 : 0);
  if (age < 13) return 'UNDER_13';
  if (age === 13) return 'AGE_13';
  return age < 18 ? 'AGE_14_17' : 'ADULT';
}

export function calendarBirthDate(year: number, monthIndex: number, day: number): Date | null {
  if (
    !Number.isInteger(year) ||
    year < 1 ||
    year > 9999 ||
    !Number.isInteger(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function registrationBirthDateError(value: unknown, now: Date = new Date()): string | null {
  let birthDate: Date;
  if (value instanceof Date) {
    birthDate = value;
  } else if (typeof value === 'string') {
    const parts = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.exec(value);
    if (!parts) return 'Select a valid birthday';
    const calendar = calendarBirthDate(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    birthDate = new Date(value);
    if (
      !calendar ||
      calendar.getUTCFullYear() !== birthDate.getUTCFullYear() ||
      calendar.getUTCMonth() !== birthDate.getUTCMonth() ||
      calendar.getUTCDate() !== birthDate.getUTCDate()
    ) {
      return 'Select a valid birthday';
    }
  } else {
    return 'Select a valid birthday';
  }
  if (
    !Number.isFinite(birthDate.getTime()) ||
    !Number.isFinite(now.getTime()) ||
    birthDate.getUTCFullYear() < 1 ||
    birthDate.getUTCFullYear() > 9999
  ) {
    return 'Select a valid birthday';
  }
  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth();
  const birthDay = birthDate.getUTCDate();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentDay = now.getUTCDate();
  const birthdayNotReached =
    currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay);
  const age = currentYear - birthYear - (birthdayNotReached ? 1 : 0);
  if (age < 0) return 'Birthday cannot be in the future';
  if (age < MINIMUM_REGISTRATION_AGE) {
    return 'You must be at least 13 years old to create an account';
  }
  return null;
}
