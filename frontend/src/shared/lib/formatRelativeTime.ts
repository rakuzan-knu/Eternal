export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} minutes`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hours`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days} days`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} weeks`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months`;
  return `${Math.floor(days / 365)} р`;
}
