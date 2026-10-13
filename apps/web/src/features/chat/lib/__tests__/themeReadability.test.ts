import { describe, expect, it } from 'vitest';
import { DEFAULT_DARK_THEME_CONFIG } from '../../model/chatTheme';
import { checkThemeReadability, withReadableBubbles } from '../themeReadability';

describe('theme preview readability', () => {
  const readable = withReadableBubbles(DEFAULT_DARK_THEME_CONFIG);
  it('measures solid outgoing and incoming text against opaque bubbles', () => {
    expect(checkThemeReadability(readable).map((finding) => finding.status)).toEqual([
      'measured',
      'measured',
    ]);
    expect(
      checkThemeReadability(readable).every(
        (finding) => finding.ratio !== null && finding.ratio >= 4.5,
      ),
    ).toBe(true);
  });
  it('reports the weakest gradient stop rather than its average', () => {
    const findings = checkThemeReadability({
      ...readable,
      bubbleType: 'gradient',
      bubbleGradientColors: ['#000000', '#ffffff'],
      bubbleTextColor: '#ffffff',
    });
    expect(findings[0]).toMatchObject({ status: 'low', ratio: 1 });
  });
  it('checks the rendered continuous gradient even when the configured type is solid', () => {
    const findings = checkThemeReadability({
      ...readable,
      bubbleType: 'solid',
      bubbleContinuousGradient: true,
      bubbleGradientColors: ['#ffffff', '#ffffff'],
    });
    expect(findings[0]).toMatchObject({ status: 'low', ratio: 1 });
  });
  it('honors explicit text color and the scope of text customization', () => {
    const findings = checkThemeReadability({
      ...readable,
      textColor: '#171717',
      textApplyToAll: false,
    });
    expect(findings[0]).toMatchObject({ status: 'low', ratio: 1 });
    expect(findings[1]?.status).toBe('measured');
  });
  it.each([
    { bubbleOpacity: 0.5, backgroundType: 'image' as const },
    { bubbleColor: '#17171780' },
    { textEffect: 'gradient' },
    { bubbleShape: 'sheetbook-note' as const },
    { bubbleColor: 'var(--custom-color)' },
    { bubbleType: 'gradient' as const, bubbleGradientColors: ['#000000', '#171717'] },
    { bubbleType: 'gradient' as const, bubbleGradientColors: ['#171717'] },
  ])('does not certify alpha, effects, shapes or gradient interiors: %j', (overrides) => {
    expect(checkThemeReadability({ ...readable, ...overrides })[0]?.status).toBe('review');
  });
  it('leaves the original config and wallpaper/font intact until the draft is applied', () => {
    const source = {
      ...DEFAULT_DARK_THEME_CONFIG,
      backgroundType: 'image' as const,
      bgImageUrl: 'wallpaper.png',
      textFont: 'serif',
    };
    const result = withReadableBubbles(source);
    expect(result).toMatchObject({
      bgImageUrl: 'wallpaper.png',
      textFont: 'serif',
      bubbleOpacity: 1,
      incomingBubbleOpacity: 1,
      textEffect: 'minimal',
    });
    expect(source.bubbleOpacity).toBe(DEFAULT_DARK_THEME_CONFIG.bubbleOpacity);
  });
});
