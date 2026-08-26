import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getLuminance,
  getBubbleContrastTheme,
  getChatBackgroundStyle,
  getBubbleStyle,
  parseChatTheme,
  serializeChatTheme,
  hexToRgb,
  hexToRgba,
  hslToHex,
  generateHarmonicGradient,
  encodeThemeCode,
  decodeThemeCode,
  triggerHapticFeedback,
  chatThemeSchema,
  sanitizeAndValidateSvg,
  getRecentWallpapers,
  addRecentWallpaper,
  deleteRecentWallpaper,
  updateMetaThemeColor,
} from '../themeUtils';
import {
  ChatThemeConfig,
  DEFAULT_DARK_THEME_CONFIG,
  BUILT_IN_PRESETS,
} from '../../model/chatTheme';

describe('themeUtils', () => {
  describe('hexToRgb & getLuminance', () => {
    it('converts hex to rgb correctly', () => {
      expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
      expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
      expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
    });

    it('calculates WCAG relative luminance accurately', () => {
      expect(getLuminance('#ffffff')).toBeCloseTo(1, 1);
      expect(getLuminance('#000000')).toBeCloseTo(0, 1);
      expect(getLuminance('#fef08a')).toBeGreaterThan(0.7); // Light pastel yellow
      expect(getLuminance('#0b0b0c')).toBeLessThan(0.1); // Deep dark
    });
  });

  describe('hexToRgba & hslToHex', () => {
    it('converts hex to rgba with alpha channel', () => {
      expect(hexToRgba('#ffffff', 0.8)).toBe('rgba(255, 255, 255, 0.8)');
      expect(hexToRgba('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)');
    });

    it('converts HSL to hex correctly', () => {
      expect(hslToHex(0, 100, 50).toLowerCase()).toBe('#ff0000');
      expect(hslToHex(120, 100, 50).toLowerCase()).toBe('#00ff00');
      expect(hslToHex(240, 100, 50).toLowerCase()).toBe('#0000ff');
    });
  });

  describe('generateHarmonicGradient', () => {
    it('generates harmonic gradients adhering to color theory rules', () => {
      const gradient = generateHarmonicGradient(200);
      expect(gradient.colors.length).toBeGreaterThanOrEqual(2);
      expect(gradient.colors[0]).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(gradient.angle).toBeGreaterThanOrEqual(0);
      expect(gradient.angle).toBeLessThanOrEqual(360);
      expect(gradient.schemeName).toBeTruthy();
    });
  });

  describe('encodeThemeCode and decodeThemeCode with Zod Validation', () => {
    it('encodes and decodes theme config losslessly', () => {
      const customConfig: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        backgroundColor: '#1a103c',
        bubbleGradientColors: ['#ec4899', '#8b5cf6'],
        bubbleOpacity: 0.85,
        bubbleBlur: 20,
      };

      const code = encodeThemeCode(customConfig);
      expect(code.startsWith('ETERNAL-THEME:')).toBe(true);

      const decoded = decodeThemeCode(code);
      expect(decoded).not.toBeNull();
      expect(decoded?.backgroundColor).toBe('#1a103c');
      expect(decoded?.bubbleGradientColors).toEqual(['#ec4899', '#8b5cf6']);
      expect(decoded?.bubbleOpacity).toBe(0.85);
      expect(decoded?.bubbleBlur).toBe(20);
    });

    it('rejects unsafe XSS URLs in theme background images', () => {
      const maliciousPayload = {
        backgroundType: 'image',
        bgImageUrl: 'javascript:alert(1)',
      };
      const rawCode = `ETERNAL-THEME:${btoa(encodeURIComponent(JSON.stringify(maliciousPayload)))}`;
      const decoded = decodeThemeCode(rawCode);
      expect(decoded).toBeNull();
    });

    it('returns null on invalid or corrupted code', () => {
      expect(decodeThemeCode('invalid-corrupted-code')).toBeNull();
      expect(decodeThemeCode('')).toBeNull();
    });
  });

  describe('sanitizeAndValidateSvg (XSS & Injection Protection)', () => {
    it('sanitizes clean SVG safely', () => {
      const cleanSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="purple"/></svg>`;
      const res = sanitizeAndValidateSvg(cleanSvg);
      expect(res.isValid).toBe(true);
      expect(res.sanitizedSvg).toContain('circle');
    });

    it('strips <script> and inline event handlers from malicious SVG', () => {
      const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert("hacked")</script><rect width="100" height="100" onload="alert(1)" fill="red"/><foreignObject><iframe src="malicious.html"/></foreignObject></svg>`;
      const res = sanitizeAndValidateSvg(maliciousSvg);
      expect(res.isValid).toBe(true);
      expect(res.sanitizedSvg).not.toContain('<script');
      expect(res.sanitizedSvg).not.toContain('onload');
      expect(res.sanitizedSvg).not.toContain('foreignObject');
    });
  });

  describe('Recent Wallpapers Storage', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('adds and caps recent wallpapers at 5 items', async () => {
      for (let i = 1; i <= 7; i++) {
        await addRecentWallpaper({
          type: 'image',
          url: `https://example.com/wp-${i}.jpg`,
          name: `Wallpaper ${i}`,
        });
      }

      const recents = await getRecentWallpapers();
      expect(recents.length).toBeLessThanOrEqual(5);
      expect(recents[0].name).toBe('Wallpaper 7');
    });

    it('deletes a recent wallpaper by id', async () => {
      const added = await addRecentWallpaper({
        type: 'shader',
        shaderId: 'neon-smoke',
        name: 'Liquid Neon Smoke',
      });
      const idToDelete = added[0].id;
      const afterDelete = await deleteRecentWallpaper(idToDelete);
      expect(afterDelete.find((w) => w.id === idToDelete)).toBeUndefined();
    });
  });

  describe('updateMetaThemeColor', () => {
    it('updates document <meta name="theme-color">', () => {
      updateMetaThemeColor('#120726');
      const meta = document.querySelector('meta[name="theme-color"]');
      expect(meta).not.toBeNull();
      expect(meta?.getAttribute('content')).toBe('#120726');
    });
  });

  describe('triggerHapticFeedback', () => {
    it('calls navigator.vibrate when supported', () => {
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        configurable: true,
        writable: true,
      });

      triggerHapticFeedback(8);
      expect(vibrateMock).toHaveBeenCalledWith(8);
    });
  });

  describe('getBubbleContrastTheme (WCAG Smart Contrast)', () => {
    it('returns dark text for light bubbles', () => {
      const lightTheme: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        bubbleType: 'solid',
        bubbleColor: '#ffffff',
      };
      const contrast = getBubbleContrastTheme(lightTheme, true);
      expect(contrast.isLight).toBe(true);
      expect(contrast.textColor).toBe('#0f172a');
      expect(contrast.statusColor).toBe('#0f172a');
      expect(contrast.quoteBg).toBe('rgba(0, 0, 0, 0.08)');
    });

    it('returns light text for dark bubbles', () => {
      const darkTheme: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        bubbleType: 'solid',
        bubbleColor: '#1e1f29',
      };
      const contrast = getBubbleContrastTheme(darkTheme, true);
      expect(contrast.isLight).toBe(false);
      expect(contrast.textColor).toBe('#ffffff');
      expect(contrast.statusColor).toBe('#ffffff');
      expect(contrast.quoteBg).toBe('rgba(255, 255, 255, 0.12)');
    });
  });

  describe('getBubbleStyle (Glassmorphism & Safari WebKit support)', () => {
    it('supports continuous screen gradient mode', () => {
      const config: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        bubbleContinuousGradient: true,
        bubbleGradientColors: ['#ec4899', '#8b5cf6', '#3b82f6'],
        bubbleGradientAngle: 180,
      };
      const result = getBubbleStyle(config, true);
      expect(result.style.backgroundAttachment).toBe('fixed');
      expect(result.style.backgroundSize).toBe('100vw 100vh');
    });

    it('supports frosted glassmorphism opacity and blur with WebkitBackdropFilter', () => {
      const config: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        bubbleType: 'solid',
        bubbleColor: '#9333ea',
        bubbleOpacity: 0.8,
        bubbleBlur: 20,
      };
      const result = getBubbleStyle(config, true);
      expect(result.style.backdropFilter).toBe('blur(20px)');
      expect(result.style.WebkitBackdropFilter).toBe('blur(20px)');
      expect(result.style.backgroundColor).toContain('rgba(');
    });
  });

  describe('parseChatTheme and serializeChatTheme', () => {
    it('parses preset ID correctly', () => {
      const parsed = parseChatTheme('midnight-purple');
      expect(parsed.id).toBe('midnight-purple');
      expect(parsed.backgroundType).toBe('gradient');
    });

    it('parses JSON string config', () => {
      const customConfig: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        backgroundColor: '#333333',
      };
      const json = JSON.stringify(customConfig);
      const parsed = parseChatTheme(json);
      expect(parsed.backgroundColor).toBe('#333333');
    });

    it('serializes preset by id if identical to preset', () => {
      const preset = BUILT_IN_PRESETS.find((p) => p.id === 'midnight-purple')!;
      const serialized = serializeChatTheme(preset.config);
      expect(serialized).toBe('midnight-purple');
    });
  });
});
