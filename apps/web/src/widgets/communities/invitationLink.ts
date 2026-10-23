export function invitationTokenFromInput(input: string): string | null {
  const value = input.trim();
  if (/^[A-Za-z0-9_-]{43}$/.test(value)) return value;
  try {
    const url = new URL(value, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.pathname.match(/^\/invite\/([A-Za-z0-9_-]{43})\/?$/)?.[1] ?? null;
  } catch {
    return null;
  }
}
