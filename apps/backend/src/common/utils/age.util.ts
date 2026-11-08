export function completedYears(birthDate: Date, now: Date = new Date()): number | null {
  if (!Number.isFinite(birthDate.getTime()) || !Number.isFinite(now.getTime())) return null;

  const birthMonth = birthDate.getUTCMonth();
  const currentMonth = now.getUTCMonth();
  const birthdayPending =
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && now.getUTCDate() < birthDate.getUTCDate());
  const years = now.getUTCFullYear() - birthDate.getUTCFullYear() - (birthdayPending ? 1 : 0);
  return years >= 0 && birthDate.getUTCFullYear() >= 1 ? years : null;
}
