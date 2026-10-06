import { useEffect, useState } from 'react';

export interface DiscordTileTheme {
  backgroundColor: string;
  isLight: boolean;
}

const DEFAULT_THEME: DiscordTileTheme = {
  backgroundColor: '#18181b',
  isLight: false,
};

const tileThemeCache = new Map<string, DiscordTileTheme>();

export async function extractAvatarTileTheme(avatarUrl?: string | null): Promise<DiscordTileTheme> {
  if (!avatarUrl || typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  if (tileThemeCache.has(avatarUrl)) {
    return tileThemeCache.get(avatarUrl)!;
  }

  return new Promise<DiscordTileTheme>((resolve) => {
    let img: HTMLImageElement | null = new Image();
    const timeout = setTimeout(() => {
      if (img) {
        img.onload = null;
        img.onerror = null;
        img.src = '';
        img = null;
      }
      resolve(DEFAULT_THEME);
    }, 1200);

    img.crossOrigin = 'anonymous';

    img.onload = () => {
      clearTimeout(timeout);
      let canvas: HTMLCanvasElement | null = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      try {
        if (!ctx || !img) {
          tileThemeCache.set(avatarUrl, DEFAULT_THEME);
          return resolve(DEFAULT_THEME);
        }

        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 50) continue; // Skip transparent pixels

          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          totalR += r;
          totalG += g;
          totalB += b;
          count++;
        }

        if (count === 0) {
          tileThemeCache.set(avatarUrl, DEFAULT_THEME);
          return resolve(DEFAULT_THEME);
        }

        const avgR = Math.round(totalR / count);
        const avgG = Math.round(totalG / count);
        const avgB = Math.round(totalB / count);

        const rNorm = avgR / 255;
        const gNorm = avgG / 255;
        const bNorm = avgB / 255;
        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case rNorm:
              h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
              break;
            case gNorm:
              h = (bNorm - rNorm) / d + 2;
              break;
            case bNorm:
              h = (rNorm - gNorm) / d + 4;
              break;
          }
          h /= 6;
        }

        // Tame saturation to keep the tile background pleasing and non-aggressive
        const tunedS = Math.min(0.42, s);
        // Ensure lightness stays within comfortable bounds (never pure white, never pitch-black)
        const tunedL = Math.max(0.12, Math.min(0.76, l));

        const isLight = tunedL > 0.45;
        const finalBg = `hsl(${Math.round(h * 360)}, ${Math.round(tunedS * 100)}%, ${Math.round(tunedL * 100)}%)`;

        const result: DiscordTileTheme = {
          backgroundColor: finalBg,
          isLight,
        };

        tileThemeCache.set(avatarUrl, result);
        resolve(result);
      } catch {
        // Tainted canvas or reading exception
        tileThemeCache.set(avatarUrl, DEFAULT_THEME);
        resolve(DEFAULT_THEME);
      } finally {
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
      clearTimeout(timeout);
      tileThemeCache.set(avatarUrl, DEFAULT_THEME);
      resolve(DEFAULT_THEME);
    };

    img.src = avatarUrl;
  });
}

/**
 * Hook to dynamically obtain the dominant tile theme of a user's avatar
 */
export function useAvatarTileTheme(avatarUrl?: string | null): DiscordTileTheme {
  const [theme, setTheme] = useState<DiscordTileTheme>(() => {
    if (avatarUrl && tileThemeCache.has(avatarUrl)) {
      return tileThemeCache.get(avatarUrl)!;
    }
    return DEFAULT_THEME;
  });

  useEffect(() => {
    if (!avatarUrl) {
      setTheme(DEFAULT_THEME);
      return;
    }

    if (tileThemeCache.has(avatarUrl)) {
      setTheme(tileThemeCache.get(avatarUrl)!);
      return;
    }

    let active = true;
    void extractAvatarTileTheme(avatarUrl).then((res) => {
      if (active) {
        setTheme(res);
      }
    });

    return () => {
      active = false;
    };
  }, [avatarUrl]);

  return theme;
}
