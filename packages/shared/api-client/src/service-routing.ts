export type ApiService = 'core' | 'messenger' | 'reels' | 'music';
export type ServiceOrigins = Partial<Record<ApiService, string>>;

// Everything outside these feature namespaces belongs to core, including future modules.
export function getApiService(url: string): ApiService {
  const path =
    '/' +
    (url.split(/[?#]/, 1)[0] ?? '')
      .replace(/^\/+/, '')
      .replace(/^(?:api\/)?v1(?:\/|$)/, '')
      .replace(/^api(?:\/|$)/, '');
  if (/^\/integrations\/github\/callback(\/|$)/.test(path)) return 'core';
  if (/^\/(conversations|calls|crypto\/prekeys|e2ee|messenger)(\/|$)/.test(path))
    return 'messenger';
  if (/^\/reels(\/|$)/.test(path)) return 'reels';
  if (/^\/(integrations|spotify)(\/|$)/.test(path) || /^\/auth\/spotify(\/|$)/.test(path))
    return 'music';
  return 'core';
}

export function getServiceBaseUrl(url: string, origins: ServiceOrigins, fallback: string): string {
  // Absolute requests retain their explicit destination; only relative API paths are routed.
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) return fallback;
  const origin = origins[getApiService(url)]?.trim().replace(/\/+$/, '');
  if (!origin) return fallback;
  return origin.endsWith('/v1') ? origin : `${origin}/v1`;
}
