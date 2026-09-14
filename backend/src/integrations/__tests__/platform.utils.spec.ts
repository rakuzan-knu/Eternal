import {
  SUPPORTED_PLATFORMS,
  isSupportedPlatform,
  assignPlatformData,
  removePlatformData,
  escapeHtml,
} from '../platform.utils';

describe('platform.utils', () => {
  describe('isSupportedPlatform', () => {
    it('accepts valid platform names', () => {
      expect(isSupportedPlatform('steam')).toBe(true);
      expect(isSupportedPlatform('GITHUB')).toBe(true);
      expect(isSupportedPlatform(' spotify ')).toBe(true);
    });

    it('rejects unknown or dangerous platform names', () => {
      expect(isSupportedPlatform('__proto__')).toBe(false);
      expect(isSupportedPlatform('constructor')).toBe(false);
      expect(isSupportedPlatform('prototype')).toBe(false);
      expect(isSupportedPlatform('unknown_platform')).toBe(false);
      expect(isSupportedPlatform(null)).toBe(false);
      expect(isSupportedPlatform(123)).toBe(false);
    });
  });

  describe('assignPlatformData', () => {
    it('safely assigns platform data without property injection', () => {
      const existing = { steam: { id: '1' } };
      const result = assignPlatformData(existing, 'github', { id: '2' });
      expect(result).toEqual({
        steam: { id: '1' },
        github: { id: '2' },
      });
    });

    it('ignores attempts to inject __proto__ or arbitrary keys', () => {
      const existing = { steam: { id: '1' } };
      const result = assignPlatformData(existing, '__proto__', { polluted: true });
      expect(result).toEqual({ steam: { id: '1' } });
      expect(({} as any).polluted).toBeUndefined();
    });
  });

  describe('removePlatformData', () => {
    it('safely removes platform data', () => {
      const existing = { steam: { id: '1' }, github: { id: '2' } };
      const result = removePlatformData(existing, 'steam');
      expect(result).toEqual({ github: { id: '2' } });
    });
  });

  describe('escapeHtml', () => {
    it('escapes dangerous HTML characters', () => {
      expect(escapeHtml('<script>alert("xss") & \'test\'</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;) &amp; &#39;test&#39;&lt;/script&gt;',
      );
    });

    it('handles null/undefined gracefully', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });
});
