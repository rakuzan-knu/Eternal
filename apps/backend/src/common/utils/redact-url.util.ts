/** Keep request diagnostics without persisting OAuth assertions or signed upload credentials. */
export function redactRequestUrl(value: string | undefined): string {
  if (!value) return '/';
  const withoutFragment = value.split('#', 1)[0];
  const question = withoutFragment.indexOf('?');
  if (question < 0) return withoutFragment;
  const path = withoutFragment.slice(0, question);
  const params = new URLSearchParams(withoutFragment.slice(question + 1));
  const safe = new URLSearchParams();
  for (const [key, entry] of params) {
    const lower = key.toLowerCase();
    const sensitive =
      lower.startsWith('openid.') ||
      lower.startsWith('x-amz-') ||
      ['code', 'state', 'ticket', 'token', 'access_token', 'refresh_token', 'id_token'].includes(
        lower,
      );
    safe.append(key, sensitive ? '[REDACTED]' : entry);
  }
  return `${path}?${safe.toString()}`;
}
