import { describe, it, expect } from 'vitest';
import {
  calculateRelativeLuminance,
  isLightColor,
  getTextOnAccent,
  generateSemanticTokens,
} from '../themeContrastEngine';

describe('themeContrastEngine', () => {
  it('correctly computes relative luminance', () => {
    // Pure black has luminance 0
    expect(calculateRelativeLuminance('#000000')).toBeCloseTo(0, 2);
    // Pure white has luminance 1
    expect(calculateRelativeLuminance('#ffffff')).toBeCloseTo(1, 2);
    // Mid gray has intermediate luminance
    const midGrayLum = calculateRelativeLuminance('#808080');
    expect(midGrayLum).toBeGreaterThan(0.1);
    expect(midGrayLum).toBeLessThan(0.35);
  });

  it('correctly detects light canvas colors', () => {
    expect(isLightColor('#ffffff')).toBe(true);
    expect(isLightColor('#f2f3f5')).toBe(true);
    expect(isLightColor('#ffff00')).toBe(true); // bright yellow is light

    expect(isLightColor('#000000')).toBe(false);
    expect(isLightColor('#1e1f22')).toBe(false);
    expect(isLightColor('#313338')).toBe(false);
  });

  it('evaluates optimal text color on accent buttons (--text-on-accent)', () => {
    // Bright accents must have black text for readability
    expect(getTextOnAccent('#EAB308')).toBe('#000000'); // Neon Yellow
    expect(getTextOnAccent('#1ED760')).toBe('#000000'); // Spotify Green
    expect(getTextOnAccent('#06B6D4')).toBe('#000000'); // Bright Cyan

    // Deep / saturated dark accents must have white text
    expect(getTextOnAccent('#5865F2')).toBe('#ffffff'); // Discord Blurple
    expect(getTextOnAccent('#8B5CF6')).toBe('#ffffff'); // Violet
    expect(getTextOnAccent('#000000')).toBe('#ffffff'); // Pure black
  });

  it('generates inverted dark text tokens for light canvas', () => {
    const tokens = generateSemanticTokens('#ffffff', '#5865F2');
    expect(tokens.isLightCanvas).toBe(true);
    expect(tokens.textPrimary).toBe('#0f172a');
    expect(tokens.textOnAccent).toBe('#ffffff');
  });

  it('generates light text tokens for dark canvas', () => {
    const tokens = generateSemanticTokens('#1e1f22', '#1ED760');
    expect(tokens.isLightCanvas).toBe(false);
    expect(tokens.textPrimary).toBe('#ffffff');
    expect(tokens.textOnAccent).toBe('#000000'); // Spotify green button text is black
  });

  it('correctly handles detectMediaLuminance graceful fallback', async () => {
    const { detectMediaLuminance } = await import('../themeContrastEngine');
    const fakeFile = new File(['fake-data'], 'test.png', { type: 'image/png' });
    const result = await detectMediaLuminance(fakeFile);
    expect(['dark', 'light']).toContain(result);
  });
});
