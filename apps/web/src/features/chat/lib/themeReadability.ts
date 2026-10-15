import type { ChatThemeConfig } from '../model/chatTheme';
import { getBubbleContrastTheme, getLuminance } from './themeUtils';

export interface ThemeReadabilityFinding {
  direction: 'Outgoing' | 'Incoming';
  status: 'low' | 'review' | 'measured';
  ratio: number | null;
  message: string;
}

function opaqueHex(color: string) {
  return /^#(?:[\da-f]{3}|[\da-f]{6}|[\da-f]{6}ff)$/i.test(color);
}

/** Conservative preview check: never certify unmeasured media, alpha or effects. */
export function checkThemeReadability(config: ChatThemeConfig): ThemeReadabilityFinding[] {
  return [true, false].map((own) => {
    const direction = own ? 'Outgoing' : 'Incoming';
    const opacity = own ? (config.bubbleOpacity ?? 0.95) : (config.incomingBubbleOpacity ?? 0.85);
    const gradient = own && (config.bubbleType !== 'solid' || config.bubbleContinuousGradient);
    const colors = gradient
      ? config.bubbleGradientColors || ['#9333ea', '#6366f1']
      : [own ? config.bubbleColor || '#9333ea' : config.incomingBubbleColor || '#12131b'];
    const styled = own || config.textApplyToAll;
    const textColor =
      styled && config.textColor && config.textColor !== 'auto'
        ? config.textColor
        : getBubbleContrastTheme(config, own).textColor;
    if (
      opacity < 1 ||
      !colors.length ||
      (gradient && colors.length < 2) ||
      !colors.every(opaqueHex) ||
      !opaqueHex(textColor) ||
      (config.bubbleShape &&
        !['default', 'ios-classic', 'telegram-modern'].includes(config.bubbleShape)) ||
      (styled && config.textEffect && config.textEffect !== 'minimal')
    ) {
      return {
        direction,
        status: 'review',
        ratio: null,
        message: `${direction}: transparency, decorations or text effects need a visual check.`,
      };
    }
    const text = getLuminance(textColor);
    const ratio = Math.min(
      ...colors.map((color) => {
        const background = getLuminance(color);
        return (Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05);
      }),
    );
    if (ratio < 4.5)
      return {
        direction,
        status: 'low',
        ratio,
        message: `${direction}: low contrast (${ratio.toFixed(2)}:1). Try readable bubbles.`,
      };
    if (gradient)
      return {
        direction,
        status: 'review',
        ratio,
        message: `${direction}: gradient stops reach ${ratio.toFixed(2)}:1; check the transitions visually.`,
      };
    return {
      direction,
      status: 'measured',
      ratio,
      message: `${direction}: solid message text reaches ${ratio.toFixed(2)}:1.`,
    };
  });
}

/** Explicit draft action; no persistence/schema change or silent override of user choices. */
export function withReadableBubbles(config: ChatThemeConfig): ChatThemeConfig {
  return {
    ...config,
    bubbleShape: 'default',
    bubbleType: 'solid',
    bubbleColor: '#171717',
    bubbleTextColor: '#ffffff',
    bubbleOpacity: 1,
    bubbleBlur: 0,
    bubbleContinuousGradient: false,
    incomingBubbleType: 'solid',
    incomingBubbleColor: '#171717',
    incomingBubbleTextColor: '#ffffff',
    incomingBubbleOpacity: 1,
    incomingBubbleBlur: 0,
    textEffect: 'minimal',
    textColor: 'auto',
  };
}
