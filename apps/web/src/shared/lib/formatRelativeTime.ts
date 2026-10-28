import { getLocale } from './language/locale';

export function formatRelativeTime(iso: string | Date | null | undefined): string {
  const locale = getLocale();
  const now = locale.startsWith('en')
    ? 'just now'
    : new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(0, 'second');
  if (!iso) return now;
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs)) return now;
  const formatUnit = (count: number, unit: string) =>
    new Intl.NumberFormat(locale, {
      style: 'unit',
      unit,
      unitDisplay: 'long',
      maximumFractionDigits: 0,
    }).format(count);
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return now;
  if (min < 60) return formatUnit(min, 'minute');
  const hr = Math.floor(min / 60);
  if (hr < 24) return formatUnit(hr, 'hour');
  const days = Math.floor(hr / 24);
  if (days < 7) return formatUnit(days, 'day');
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return formatUnit(weeks, 'week');
  const months = Math.floor(days / 30);
  if (days < 365) return formatUnit(months, 'month');
  return formatUnit(Math.floor(days / 365), 'year');
}
