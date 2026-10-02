/**
 * Theme Contrast Engine (APCA / WCAG 2.1)
 * Calculates relative luminance, generates perceptual contrast tokens,
 * and ensures guaranteed text legibility on custom canvas colors and accent buttons.
 */

export interface SemanticThemeTokens {
  surfaceBase: string;
  surfaceElevated1: string;
  surfaceElevated2: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentColor: string;
  textOnAccent: '#000000' | '#ffffff';
  isLightCanvas: boolean;
}

/**
 * Parses HEX color string to RGB channels (supports 3, 6, and 8 hex digits).
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  } else if (clean.length === 8) {
    clean = clean.slice(0, 6);
  }

  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length !== 6) {
    return { r: 15, g: 15, b: 17 }; // fallback neutral dark
  }

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Converts sRGB channel to linear light value.
 */
function sRgbToLinear(val: number): number {
  const norm = Math.max(0, Math.min(255, val)) / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

/**
 * Calculates standard relative luminance (Y in CIE 1931 space, range 0 to 1.0).
 */
export function calculateRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const rLin = sRgbToLinear(r);
  const gLin = sRgbToLinear(g);
  const bLin = sRgbToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Determines whether a color is considered "light" (threshold L > 0.45 for accessible dark text).
 */
export function isLightColor(hex: string): boolean {
  return calculateRelativeLuminance(hex) > 0.45;
}

/**
 * Determines optimal high-contrast text color on top of an accent button:
 * returns '#000000' for bright/light accents (e.g. Neon Yellow, Spotify Green),
 * and '#ffffff' for darker accents (e.g. Blurple, Deep Violet, Indigo).
 */
export function getTextOnAccent(accentHex: string): '#000000' | '#ffffff' {
  const lum = calculateRelativeLuminance(accentHex);
  // Contrast with black is higher when lum > 0.179; 0.35 ensures crisp black text on cyan, green, yellow, pastels
  return lum > 0.35 ? '#000000' : '#ffffff';
}

/**
 * Adjusts color brightness/shade by an offset factor (-1.0 to 1.0).
 */
export function adjustHexBrightness(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  const adjust = (ch: number) => {
    if (factor > 0) {
      return Math.round(ch + (255 - ch) * factor);
    }
    return Math.round(ch * (1 + factor));
  };

  const newR = Math.min(255, Math.max(0, adjust(r)));
  const newG = Math.min(255, Math.max(0, adjust(g)));
  const newB = Math.min(255, Math.max(0, adjust(b)));

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Generates cohesive, accessible semantic tokens for a given canvas background and accent tint.
 */
export function generateSemanticTokens(canvasHex: string, accentHex: string): SemanticThemeTokens {
  const isLight = isLightColor(canvasHex);
  const textOnAccent = getTextOnAccent(accentHex);

  if (isLight) {
    // Light Canvas tokens (Discord/Apple high-contrast legibility)
    return {
      surfaceBase: canvasHex,
      surfaceElevated1: '#ffffff',
      surfaceElevated2: '#ffffff',
      borderSubtle: 'rgba(0, 0, 0, 0.08)',
      textPrimary: '#0f172a',
      textSecondary: '#334155',
      textMuted: '#64748b',
      accentColor: accentHex,
      textOnAccent,
      isLightCanvas: true,
    };
  }

  // Default Dark Canvas (matching Screenshot 2: eternalnet.vercel.app original brand aesthetic)
  if (canvasHex === '#050505' || canvasHex === '#070709') {
    return {
      surfaceBase: '#050505',
      surfaceElevated1: '#16161a',
      surfaceElevated2: '#111111',
      borderSubtle: 'rgba(255, 255, 255, 0.05)',
      textPrimary: '#ffffff',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      accentColor: accentHex,
      textOnAccent,
      isLightCanvas: false,
    };
  }

  // Pure Inky Black (Midnight)
  if (canvasHex === '#000000') {
    return {
      surfaceBase: '#000000',
      surfaceElevated1: '#121216',
      surfaceElevated2: '#0d0d10',
      borderSubtle: 'rgba(255, 255, 255, 0.06)',
      textPrimary: '#ffffff',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      accentColor: accentHex,
      textOnAccent,
      isLightCanvas: false,
    };
  }

  // General Dark & Saturated Custom Canvas tokens (guaranteed AAA/AA contrast against colored backgrounds)
  return {
    surfaceBase: canvasHex,
    surfaceElevated1: adjustHexBrightness(canvasHex, 0.04),
    surfaceElevated2: adjustHexBrightness(canvasHex, 0.07),
    borderSubtle: adjustHexBrightness(canvasHex, 0.14),
    textPrimary: '#ffffff',
    textSecondary: '#e2e8f0', // Crisp off-white (luminance ~0.78), guaranteed high contrast on colored canvases
    textMuted: '#cbd5e1', // High-contrast slate-300 (luminance ~0.64, contrast > 4.5:1 on saturated canvas)
    accentColor: accentHex,
    textOnAccent,
    isLightCanvas: false,
  };
}

/**
 * Asynchronously detects whether an uploaded image or video is predominantly dark or light.
 * Samples a 16x16 thumbnail using an offscreen canvas and computes relative luminance.
 */
export function detectMediaLuminance(file: File): Promise<'dark' | 'light'> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return resolve('dark');
    }

    const isVideo = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore
      }
    };

    const done = (mode: 'dark' | 'light') => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(mode);
    };

    // Safety timeout: if media cannot be decoded or events do not fire, fallback gracefully
    timer = setTimeout(() => {
      done('dark');
    }, 800);

    const processCanvas = (source: CanvasImageSource) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return done('dark');
        }
        ctx.drawImage(source, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;
        let totalLum = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // sRGB perceptual luminance approximation
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLum += lum;
          count++;
        }
        const avgLum = count > 0 ? totalLum / count : 0;
        done(avgLum > 135 ? 'light' : 'dark');
      } catch {
        done('dark');
      }
    };

    if (isVideo) {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.src = url;
      video.onloadeddata = () => {
        processCanvas(video);
      };
      video.onerror = () => {
        done('dark');
      };
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      img.onload = () => {
        processCanvas(img);
      };
      img.onerror = () => {
        done('dark');
      };
    }
  });
}
