export function includeServiceCorsOrigin(origins: string[]): string[] {
  const configuredUrl = process.env.RENDER_EXTERNAL_URL?.trim();
  if (!configuredUrl) return origins;

  try {
    const url = new URL(configuredUrl);
    // Popup launch pages POST to their own service. Only trust the configured
    // canonical HTTPS origin, never request Host or forwarded headers.
    if (
      url.protocol !== 'https:' ||
      url.hostname.includes('*') ||
      (configuredUrl !== url.origin && configuredUrl !== `${url.origin}/`)
    ) {
      return origins;
    }
    return origins.includes(url.origin) ? origins : [...origins, url.origin];
  } catch {
    return origins;
  }
}
