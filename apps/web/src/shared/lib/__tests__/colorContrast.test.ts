import { describe, it, expect } from 'vitest';
import {
  getAdaptiveContrastColor,
  adaptGradientString,
  adaptGummyColors,
  getRelativeLuminance,
} from '../colorContrast';

describe('colorContrast adaptive visibility utility', () => {
  it('converts pure white to dark charcoal on light theme', () => {
    const adjusted = getAdaptiveContrastColor('#ffffff', true);
    expect(adjusted).toBe('#18181b');
  });

  it('keeps pure white bright on dark theme', () => {
    const adjusted = getAdaptiveContrastColor('#ffffff', false);
    expect(adjusted.toLowerCase()).toBe('#ffffff');
  });

  it('converts pure black to white on dark theme', () => {
    const adjusted = getAdaptiveContrastColor('#000000', false);
    expect(adjusted).toBe('#ffffff');
  });

  it('keeps pure black dark on light theme', () => {
    const adjusted = getAdaptiveContrastColor('#000000', true);
    expect(adjusted.toLowerCase()).toBe('#000000');
  });

  it('intelligently darkens yellow on light theme while preserving hue', () => {
    const original = '#ffff00'; // high luminance yellow
    const adjusted = getAdaptiveContrastColor(original, true);
    expect(adjusted).not.toBe(original);
    // Luminance of adjusted must be significantly lower to guarantee contrast
    expect(getRelativeLuminance(adjusted)).toBeLessThan(0.35);
  });

  it('intelligently brightens dark navy on dark theme while preserving hue', () => {
    const original = '#000033'; // very dark navy
    const adjusted = getAdaptiveContrastColor(original, false);
    expect(adjusted).not.toBe(original);
    // Lightness elevated to 72% makes it vibrant and readable
    expect(getRelativeLuminance(adjusted)).toBeGreaterThan(0.18);
  });

  it('adapts gradients correctly for light and dark backgrounds', () => {
    const grad = 'linear-gradient(135deg, #ffffff 0%, #ffff88 100%)';
    const adaptedLight = adaptGradientString(grad, true);
    expect(adaptedLight).not.toContain('#ffffff');
    expect(adaptedLight).toContain('linear-gradient');

    const darkGrad = 'linear-gradient(135deg, #000000 0%, #111111 100%)';
    const adaptedDark = adaptGradientString(darkGrad, false);
    expect(adaptedDark).not.toContain('#000000');
  });

  it('adapts gummy palette colors correctly', () => {
    const gummy = ['#ffffff', '#fff500', '#fefefe', '#fafafa'];
    const adapted = adaptGummyColors(gummy, true);
    expect(adapted).toHaveLength(4);
    adapted.forEach((c) => {
      expect(getRelativeLuminance(c)).toBeLessThan(0.4);
    });
  });
});
