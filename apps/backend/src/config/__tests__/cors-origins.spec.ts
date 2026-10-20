import { includeServiceCorsOrigin } from '../cors-origins';

describe('includeServiceCorsOrigin', () => {
  const frontend = 'https://web.example';
  const service = 'https://eternal-music-hub.onrender.com';

  afterEach(() => vi.unstubAllEnvs());

  it.each([service, `${service}/`, ` ${service}/ `])(
    'includes the exact service origin from %s without changing configured frontend origins',
    (configuredUrl) => {
      vi.stubEnv('RENDER_EXTERNAL_URL', configuredUrl);
      const origins = [frontend];

      expect(includeServiceCorsOrigin(origins)).toEqual([frontend, service]);
      expect(origins).toEqual([frontend]);
    },
  );

  it('does not duplicate the service origin when explicitly allowed', () => {
    vi.stubEnv('RENDER_EXTERNAL_URL', service);
    expect(includeServiceCorsOrigin([frontend, service])).toEqual([frontend, service]);
  });

  it.each([
    undefined,
    '',
    'not a URL',
    'null',
    'https://*.onrender.com',
    'http://eternal-music-hub.onrender.com',
    `${service}/v1`,
    `${service}/?origin=https://evil.example`,
    `${service}/#fragment`,
    'https://user:password@eternal-music-hub.onrender.com',
    'https://ETERNAL-MUSIC-HUB.onrender.com',
    'https://eternal-music-hub.onrender.com:443',
  ])('ignores missing or noncanonical service URL %s', (configuredUrl) => {
    vi.stubEnv('RENDER_EXTERNAL_URL', configuredUrl);
    expect(includeServiceCorsOrigin([frontend])).toEqual([frontend]);
  });
});
