/**
 * Utility for extracting dominant and complementary ambient theme colors
 * from album art in real-time, with CORS-safe offscreen canvas sampling
 * and deterministic harmonic fallbacks.
 */

export interface AmbientPalette {
  primary: string; // e.g. "rgb(42, 75, 124)"
  secondary: string; // e.g. "rgb(18, 28, 48)"
  glow: string; // e.g. "rgba(42, 75, 124, 0.45)"
  bgGradient: string; // Ready-to-use radial/linear CSS gradient
}

const MAX_CACHE_SIZE = 30;
const colorCache = new Map<string, AmbientPalette>();

function cachePalette(url: string, palette: AmbientPalette) {
  if (colorCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = colorCache.keys().next().value;
    if (oldestKey) {
      colorCache.delete(oldestKey);
    }
  }
  colorCache.set(url, palette);
}

function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function generateFallbackPalette(seed = 'spotify-track'): AmbientPalette {
  const hue = stringToHue(seed);
  const primary = `hsl(${hue}, 55%, 32%)`;
  const secondary = `hsl(${(hue + 40) % 360}, 45%, 14%)`;
  const glow = `hsla(${hue}, 60%, 45%, 0.35)`;
  const bgGradient = `radial-gradient(circle at 50% 25%, ${primary} 0%, ${secondary} 65%, #090a0f 100%)`;

  return { primary, secondary, glow, bgGradient };
}

export async function extractDominantColors(
  imageUrl?: string | null,
  fallbackSeed = 'track',
): Promise<AmbientPalette> {
  if (!imageUrl) {
    return generateFallbackPalette(fallbackSeed);
  }

  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl)!;
  }

  return new Promise<AmbientPalette>((resolve) => {
    let img: HTMLImageElement | null = new Image();

    // Safety timeout: if image loading takes too long, resolve with fallback
    const timer = setTimeout(() => {
      if (img) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        img = null;
      }
      resolve(generateFallbackPalette(fallbackSeed));
    }, 1500);

    // Critical: set crossOrigin BEFORE src to allow canvas data reading
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      clearTimeout(timer);
      let canvas: HTMLCanvasElement | null = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      try {
        if (!ctx || !img) {
          const fallback = generateFallbackPalette(fallbackSeed);
          cachePalette(imageUrl, fallback);
          return resolve(fallback);
        }

        ctx.drawImage(img, 0, 0, 16, 16);
        const imgData = ctx.getImageData(0, 0, 16, 16).data;

        let totalR = 0,
          totalG = 0,
          totalB = 0,
          count = 0;

        // Collect color samples avoiding near-black and near-white extremes
        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;

          // Skip extreme darkness or pure whites
          if (brightness > 25 && brightness < 235) {
            totalR += r;
            totalG += g;
            totalB += b;
            count++;
          }
        }

        if (count === 0) {
          const fallback = generateFallbackPalette(fallbackSeed);
          cachePalette(imageUrl, fallback);
          return resolve(fallback);
        }

        const avgR = Math.round(totalR / count);
        const avgG = Math.round(totalG / count);
        const avgB = Math.round(totalB / count);

        // Ensure primary color has pleasant deep saturation
        const primaryR = Math.min(255, Math.max(20, Math.round(avgR * 0.95)));
        const primaryG = Math.min(255, Math.max(20, Math.round(avgG * 0.95)));
        const primaryB = Math.min(255, Math.max(20, Math.round(avgB * 0.95)));

        // Secondary darker tone
        const secondaryR = Math.round(primaryR * 0.35);
        const secondaryG = Math.round(primaryG * 0.35);
        const secondaryB = Math.round(primaryB * 0.35);

        const primary = `rgb(${primaryR}, ${primaryG}, ${primaryB})`;
        const secondary = `rgb(${secondaryR}, ${secondaryG}, ${secondaryB})`;
        const glow = `rgba(${primaryR}, ${primaryG}, ${primaryB}, 0.4)`;
        const bgGradient = `radial-gradient(circle at 50% 25%, ${primary} 0%, ${secondary} 65%, #090a0f 100%)`;

        const palette: AmbientPalette = {
          primary,
          secondary,
          glow,
          bgGradient,
        };

        cachePalette(imageUrl, palette);
        resolve(palette);
      } catch {
        // Tainted canvas or reading exception fallback
        const fallback = generateFallbackPalette(fallbackSeed);
        cachePalette(imageUrl, fallback);
        resolve(fallback);
      } finally {
        // Explicitly release canvas buffer and image DOM textures for immediate V8 GC
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
          canvas = null;
        }
        if (img) {
          img.onload = null;
          img.onerror = null;
          img.src = '';
          img = null;
        }
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      if (img) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        img = null;
      }
      const fallback = generateFallbackPalette(fallbackSeed);
      resolve(fallback);
    };

    img.src = imageUrl;
  });
}
