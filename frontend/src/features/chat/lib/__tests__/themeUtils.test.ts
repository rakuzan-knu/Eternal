import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getLuminance,
  getBubbleContrastTheme,
  getChatBackgroundStyle,
  getBubbleStyle,
  getBubbleShapeStyles,
  getThemeTextStyle,
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

    it('encodes and decodes full theme with custom image, bubble shape/colors, and typography', () => {
      const fullCustomConfig: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        backgroundType: 'image',
        bgImageUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        bgBrightness: 0.75,
        bgBlur: 5,
        bubbleShape: 'sheetbook-note',
        bubbleType: 'solid',
        bubbleColor: '#ffffff',
        bubbleTextColor: '#0f172a',
        incomingBubbleColor: '#f1f5f9',
        incomingBubbleTextColor: '#0f172a',
        textFont: 'pixel-arcade',
        textEffect: 'neon',
        textColor: '#10b981',
        textApplyToAll: true,
      };

      const code = encodeThemeCode(fullCustomConfig);
      const decoded = decodeThemeCode(code);

      expect(decoded).not.toBeNull();
      expect(decoded?.backgroundType).toBe('image');
      expect(decoded?.bgImageUrl).toBe(fullCustomConfig.bgImageUrl);
      expect(decoded?.bubbleShape).toBe('sheetbook-note');
      expect(decoded?.bubbleTextColor).toBe('#0f172a');
      expect(decoded?.incomingBubbleColor).toBe('#f1f5f9');
      expect(decoded?.incomingBubbleTextColor).toBe('#0f172a');
      expect(decoded?.textFont).toBe('pixel-arcade');
      expect(decoded?.textEffect).toBe('neon');
      expect(decoded?.textColor).toBe('#10b981');
      expect(decoded?.textApplyToAll).toBe(true);
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

    it('identifies sheetbook-note as a light bubble with dark text', () => {
      const noteTheme: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        bubbleShape: 'sheetbook-note',
      };
      const contrast = getBubbleContrastTheme(noteTheme, true);
      expect(contrast.isLight).toBe(true);
      expect(contrast.textColor).toBe('#0f172a');
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

    it('serializes pure shader preset with default bubbles as shader:id', () => {
      const config: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        backgroundType: 'shader',
        shaderPresetId: 'synthwave-grid',
      };
      const serialized = serializeChatTheme(config);
      expect(serialized).toBe('shader:synthwave-grid');
    });

    it('encodes shader preset with custom bubbles losslessly as ETERNAL-THEME code', () => {
      const config: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        backgroundType: 'shader',
        shaderPresetId: 'synthwave-grid',
        bubbleColor: '#ff0055',
        bubbleType: 'solid',
      };
      const serialized = serializeChatTheme(config);
      expect(serialized.startsWith('ETERNAL-THEME:')).toBe(true);
      const decoded = parseChatTheme(serialized);
      expect(decoded.backgroundType).toBe('shader');
      expect(decoded.shaderPresetId).toBe('synthwave-grid');
      expect(decoded.bubbleColor).toBe('#ff0055');
      expect(decoded.bubbleType).toBe('solid');
    });
  });

  describe('CSS Non-conflicting styles (React DOM warning prevention)', () => {
    it('uses backgroundImage instead of shorthand background to prevent React style collisions', () => {
      const gradientTheme: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        backgroundType: 'gradient',
        gradientColors: ['#ff0055', '#00ffee'],
      };
      const bgStyle = getChatBackgroundStyle(gradientTheme);
      expect(bgStyle.backgroundImage).toContain('linear-gradient(');
      expect((bgStyle as Record<string, unknown>).background).toBeUndefined();

      const bubbleStyle = getBubbleStyle(gradientTheme, true);
      expect(bubbleStyle.style.backgroundImage).toContain('linear-gradient(');
      expect((bubbleStyle.style as Record<string, unknown>).background).toBeUndefined();
    });

    it('validates data: URLs and blob: URLs in safeUrlSchema', () => {
      const validDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      expect(chatThemeSchema.safeParse({ bgImageUrl: validDataUrl }).success).toBe(true);

      const blobUrl = 'blob:http://localhost:5173/78294a20-333e-48a6-8be2-8b61e27a7c1b';
      expect(chatThemeSchema.safeParse({ bgImageUrl: blobUrl }).success).toBe(true);
    });
  });

  describe('getBubbleShapeStyles and bubbleShape presets', () => {
    it('computes iOS Classic with squircle corners and iOS tail on end message', () => {
      const singleOwn = getBubbleShapeStyles('ios-classic', true, 'single');
      expect(singleOwn.roundingClass).toContain('rounded-[20px]');
      expect(singleOwn.showTail).toBe(true);
      expect(singleOwn.tailType).toBe('ios');

      const middleOwn = getBubbleShapeStyles('ios-classic', true, 'middle');
      expect(middleOwn.showTail).toBe(false);
    });

    it('computes Telegram Modern with acute sharp corner and Telegram tail on end message', () => {
      const singleOwn = getBubbleShapeStyles('telegram-modern', true, 'single');
      expect(singleOwn.roundingClass).toContain('rounded-br-[3px]');
      expect(singleOwn.showTail).toBe(true);
      expect(singleOwn.tailType).toBe('telegram');

      const singleIncoming = getBubbleShapeStyles('telegram-modern', false, 'single');
      expect(singleIncoming.roundingClass).toContain('rounded-bl-[3px]');
      expect(singleIncoming.showTail).toBe(true);
      expect(singleIncoming.tailType).toBe('telegram');
    });

    it('computes Cyber Glass with neon border, glow shadow, and no tail', () => {
      const cyberOwn = getBubbleShapeStyles('cyber-glass', true, 'single');
      expect(cyberOwn.roundingClass).toBe('rounded-2xl');
      expect(cyberOwn.extraClass).toContain('border-cyan-400');
      expect(cyberOwn.extraClass).toContain('shadow-');
      expect(cyberOwn.showTail).toBe(false);
      expect(cyberOwn.tailType).toBeNull();
    });

    it('computes Retro Pixel with square corners, pixelated border shadow, and no tail', () => {
      const pixel = getBubbleShapeStyles('retro-pixel', true, 'single');
      expect(pixel.roundingClass).toBe('rounded-none');
      expect(pixel.extraClass).toContain('border-2');
      expect(pixel.extraClass).toContain('shadow-');
      expect(pixel.showTail).toBe(false);
      expect(pixel.tailType).toBeNull();
    });

    it('validates bubbleShape in chatThemeSchema for all new shapes', () => {
      const shapes = [
        'cyber-glass',
        'liquid-neon',
        'star-bubble',
        'pink-cream',
        'sheetbook-note',
        'moon-bubble',
        'cloudy-bubble',
        'evil-bubble',
        'halo-bubble',
        'system-bubble',
      ] as const;

      shapes.forEach((shape) => {
        const valid = chatThemeSchema.safeParse({ bubbleShape: shape });
        expect(valid.success).toBe(true);
        if (valid.success) {
          expect(valid.data.bubbleShape).toBe(shape);
        }
      });
    });

    it('computes styles for newly added bubble shapes', () => {
      const liquid = getBubbleShapeStyles('liquid-neon', true, 'single');
      expect(liquid.roundingClass).toBe('rounded-[22px]');
      expect(liquid.extraClass).toContain('border-purple-500');

      const star = getBubbleShapeStyles('star-bubble', true, 'single');
      expect(star.roundingClass).toContain('rounded-br-[6px]');
      expect(star.showTail).toBe(true);

      const cream = getBubbleShapeStyles('pink-cream', true, 'single');
      expect(cream.roundingClass).toBe('rounded-t-[22px] rounded-b-[6px]');
      expect(cream.extraClass).toContain('pb-3.5');

      const note = getBubbleShapeStyles('sheetbook-note', true, 'single');
      expect(note.roundingClass).toBe('rounded-[16px]');
      expect(note.extraStyle.backgroundColor).toBe('#ffffff');

      const moon = getBubbleShapeStyles('moon-bubble', true, 'single');
      expect(moon.roundingClass).toBe('rounded-[22px]');

      const cloudy = getBubbleShapeStyles('cloudy-bubble', true, 'single');
      expect(cloudy.roundingClass).toBe('rounded-t-[22px] rounded-b-[4px]');

      const evil = getBubbleShapeStyles('evil-bubble', true, 'single');
      expect(evil.extraClass).toContain('border-red-500');

      const halo = getBubbleShapeStyles('halo-bubble', true, 'single');
      expect(halo.extraClass).toContain('border-amber-400');

      const system = getBubbleShapeStyles('system-bubble', true, 'single');
      expect(system.extraClass).toContain('border-emerald-500');
    });
  });

  describe('getThemeTextStyle & Typography Customization', () => {
    it('returns empty style when config is not provided', () => {
      const result = getThemeTextStyle(null);
      expect(result.style).toEqual({});
      expect(result.className).toBe('');
    });

    it('applies styling only to own messages when textApplyToAll is false', () => {
      const theme: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        textFont: 'journal',
        textEffect: 'neon',
        textColor: '#ec4899',
        textApplyToAll: false,
      };

      const ownStyle = getThemeTextStyle(theme, true);
      expect(ownStyle.className).toContain('msg-effect-neon');
      expect(ownStyle.style.fontFamily).toContain('Caveat');
      expect(ownStyle.style.color).toBe('#ec4899');

      const otherStyle = getThemeTextStyle(theme, false);
      expect(otherStyle.style).toEqual({});
      expect(otherStyle.className).toBe('');
    });

    it('applies styling to both own and other messages when textApplyToAll is true', () => {
      const theme: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        textFont: 'pixel-arcade',
        textEffect: 'cartoon',
        textApplyToAll: true,
      };

      const otherStyle = getThemeTextStyle(theme, false);
      expect(otherStyle.className).toContain('msg-effect-cartoon');
      expect(otherStyle.style.fontFamily).toContain('Press Start 2P');
      expect(otherStyle.style.fontSize).toBe('0.8em');
      expect(otherStyle.style.lineHeight).toBe('1.6');
    });

    it('correctly applies gradient effect and preserves base contrast color when auto', () => {
      const theme: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        textEffect: 'gradient',
        textColor: 'auto',
      };

      const style = getThemeTextStyle(theme, true, '#ffffff');
      expect(style.className).toContain('msg-effect-gradient');
    });

    it('serializes and parses textFont, textEffect, textColor, and textApplyToAll in theme codes', () => {
      const customTheme: ChatThemeConfig = {
        ...DEFAULT_DARK_THEME_CONFIG,
        textFont: 'medieval',
        textEffect: 'prism',
        textColor: '#10b981',
        textApplyToAll: true,
      };

      const serialized = serializeChatTheme(customTheme);
      const parsed = parseChatTheme(serialized);

      expect(parsed.textFont).toBe('medieval');
      expect(parsed.textEffect).toBe('prism');
      expect(parsed.textColor).toBe('#10b981');
      expect(parsed.textApplyToAll).toBe(true);
    });
  });
});
