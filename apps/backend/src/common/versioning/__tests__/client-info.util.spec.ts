import { extractClientInfo, isVersionOlder } from '../client-info.util';

describe('client-info.util', () => {
  describe('extractClientInfo', () => {
    it('detects iOS client from User-Agent', () => {
      const headers = {
        'user-agent': 'SocialNetwork-iOS/1.4.2 (iPhone; iOS 16.5; Scale/3.00)',
      };
      const info = extractClientInfo(headers);
      expect(info.clientType).toBe('ios');
      expect(info.isMobile).toBe(true);
      expect(info.clientVersion).toBe('1.4.2');
    });

    it('detects iOS client from CFNetwork user agent', () => {
      const headers = {
        'user-agent': 'SocialNetwork/1.2 CFNetwork/1408.0.4 Darwin/22.5.0',
      };
      const info = extractClientInfo(headers);
      expect(info.clientType).toBe('ios');
      expect(info.isMobile).toBe(true);
      expect(info.clientVersion).toBe('1.2');
    });

    it('detects Android client from User-Agent and okhttp', () => {
      const headers = {
        'user-agent': 'SocialNetwork-Android/2.0.1 okhttp/4.9.3',
      };
      const info = extractClientInfo(headers);
      expect(info.clientType).toBe('android');
      expect(info.isMobile).toBe(true);
      expect(info.clientVersion).toBe('2.0.1');
    });

    it('prefers explicit headers over User-Agent parsing', () => {
      const headers = {
        'user-agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7)',
        'x-app-version': '3.5.0',
        'x-platform': 'ios',
        'x-api-version': '2',
      };
      const info = extractClientInfo(headers);
      expect(info.clientType).toBe('ios');
      expect(info.isMobile).toBe(true);
      expect(info.clientVersion).toBe('3.5.0');
      expect(info.apiVersion).toBe('2');
    });

    it('detects Web browser user agent', () => {
      const headers = {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36',
      };
      const info = extractClientInfo(headers);
      expect(info.clientType).toBe('web');
      expect(info.isMobile).toBe(false);
    });

    it('handles missing or empty headers gracefully', () => {
      const info = extractClientInfo({});
      expect(info.clientType).toBe('unknown');
      expect(info.isMobile).toBe(false);
      expect(info.clientVersion).toBeUndefined();
      expect(info.apiVersion).toBeUndefined();
    });
  });

  describe('isVersionOlder', () => {
    it('compares standard semver versions correctly', () => {
      expect(isVersionOlder('1.0.0', '2.0.0')).toBe(true);
      expect(isVersionOlder('1.9.9', '2.0.0')).toBe(true);
      expect(isVersionOlder('2.0.0', '2.0.1')).toBe(true);
      expect(isVersionOlder('2.1.0', '2.1.0')).toBe(false);
      expect(isVersionOlder('2.5.0', '2.1.0')).toBe(false);
      expect(isVersionOlder('3.0.0', '2.9.9')).toBe(false);
    });

    it('handles v-prefixed versions and two-part versions', () => {
      expect(isVersionOlder('v1.2', 'v1.3')).toBe(true);
      expect(isVersionOlder('v2.0', 'v1.9')).toBe(false);
    });

    it('returns false when either version is undefined', () => {
      expect(isVersionOlder(undefined, '1.0.0')).toBe(false);
      expect(isVersionOlder('1.0.0', undefined)).toBe(false);
    });
  });
});
