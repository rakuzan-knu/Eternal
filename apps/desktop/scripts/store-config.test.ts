import { describe, expect, it } from 'vitest';
import { microsoftStoreIdentity, snapName, stableStoreVersion } from './store-config';

describe('store submission preflight', () => {
  it('requires explicit Store identity rather than embedding personal registration data', () => {
    expect(() => microsoftStoreIdentity({})).toThrow();
    expect(() =>
      microsoftStoreIdentity({
        ETERNAL_DESKTOP_STORE_IDENTITY: '',
        ETERNAL_DESKTOP_STORE_PUBLISHER: '',
        ETERNAL_DESKTOP_STORE_PUBLISHER_DISPLAY_NAME: '',
      }),
    ).toThrow();
    expect(snapName()).toBe('eternal-desktop');
  });
  it('validates explicit Partner Center overrides', () => {
    const env = {
      ETERNAL_DESKTOP_STORE_IDENTITY: '12345.Eternal',
      ETERNAL_DESKTOP_STORE_PUBLISHER: 'CN=00000000-0000-0000-0000-000000000000',
      ETERNAL_DESKTOP_STORE_PUBLISHER_DISPLAY_NAME: 'Eternal Publisher',
    };
    expect(microsoftStoreIdentity(env)).toEqual({
      identityName: env.ETERNAL_DESKTOP_STORE_IDENTITY,
      publisher: env.ETERNAL_DESKTOP_STORE_PUBLISHER,
      publisherDisplayName: env.ETERNAL_DESKTOP_STORE_PUBLISHER_DISPLAY_NAME,
    });
    expect(() =>
      microsoftStoreIdentity({ ...env, ETERNAL_DESKTOP_STORE_PUBLISHER: 'CN=x\n' }),
    ).toThrow();
  });

  it.each(['0.0.0', '1.0.0-beta.1', '1.0.0+build', '65536.0.0', '01.0.0', '../1.0.0'])(
    'rejects versions that cannot be submitted as a stable Store release: %s',
    (version) => {
      expect(() => stableStoreVersion(version)).toThrow();
    },
  );
  it('keeps the reserved fourth Windows version component at zero', () => {
    expect(stableStoreVersion('1.12.0')).toBe('1.12.0');
  });
  it('validates a reserved Snap name before using it as an executable name', () => {
    expect(snapName('eternal-desktop')).toBe('eternal-desktop');
    for (const name of ['../../app', 'Eternal', 'eternal--desktop', 'eternal-', ''])
      expect(() => snapName(name)).toThrow();
  });
});
