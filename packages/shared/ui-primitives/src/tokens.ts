/**
 * Shared Eternal foundations. Numeric geometry uses logical px/points at a
 * 16px web root; the CSS adapter emits rem. Content/chat palettes stay owned
 * by their features. No light application palette is enabled by these tokens.
 */
export const designTokens = {
  brand: {
    purple: '#5822B4',
    glow: '#A855F7',
    void: '#07050F',
    black: '#000000',
  },
  color: {
    canvasBody: '#050505',
    canvasApp: '#070709',
    canvasImmersive: '#08090d',
    textPrimary: '#ffffff',
    textInverse: '#000000',
  },
  /** Dark application roles. Feature/media palettes remain independent. */
  semantic: {
    text: { primary: '#ffffff', secondary: '#d4d4d4', muted: '#a3a3a3', error: '#f87171' },
    surface: {
      canvas: '#070709',
      control: 'rgb(23 23 23 / 0.8)',
      overlay: 'rgb(23 23 23 / 0.5)',
      opaque: '#171717',
    },
    border: { control: '#262626', overlay: 'rgb(38 38 38 / 0.6)', focus: 'rgb(173 70 255 / 0.5)' },
    action: {
      primary: '#ffffff',
      primaryText: '#000000',
      primaryHover: '#e5e5e5',
      secondaryHover: 'rgb(38 38 38 / 0.6)',
      destructive: '#f87171',
    },
  },
  spacing: { half: 2, xs: 4, sm: 8, md: 12, control: 14, lg: 16, xl: 20, xxl: 24, section: 32 },
  radius: { sm: 4, md: 6, lg: 8, control: 12, panel: 16, card: 24, presentation: 32 },
  typography: {
    familyWeb: {
      sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      serif: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
    },
    size: { xs: 12, sm: 14, body: 16, lg: 18, xl: 20, title: 24 },
    lineHeight: { xs: 16, sm: 20, body: 24, lg: 28, xl: 28, title: 32 },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  },
  motion: {
    duration: { fast: 150, control: 200, panel: 300, ripple: 600 },
    easing: {
      standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
      ripple: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  },
  layer: { modal: 300, settings: 310, menu: 1000, submenu: 1010, tooltip: 9999 },
  /** Web-only recipes preserve Tailwind 4.3.3 OKLCH and alpha compositing. */
  web: {
    textSecondary: 'oklch(87% 0 none)',
    textMuted: 'oklch(70.8% 0 none)',
    textError: 'oklch(70.4% 0.191 22.216)',
    primaryHover: 'oklch(92.2% 0 none)',
    secondarySurface: 'color-mix(in oklab, oklch(20.5% 0 none) 80%, transparent)',
    controlBorder: 'oklch(26.9% 0 none)',
    secondaryHover: 'color-mix(in oklab, oklch(26.9% 0 none) 60%, transparent)',
    glassSurface: 'color-mix(in oklab, oklch(20.5% 0 none) 50%, transparent)',
    glassBorder: 'color-mix(in oklab, oklch(26.9% 0 none) 60%, transparent)',
    inputFocus: 'color-mix(in oklab, oklch(62.7% 0.265 303.9) 50%, transparent)',
    toggleOff: '#333',
    toggleThumbOff: 'oklch(70.7% 0.022 261.325)',
    glassBlur: 24,
    glassShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },
} as const;
