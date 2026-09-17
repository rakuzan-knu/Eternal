/**
 * storyCanvasUtils.ts
 * Utilities for Smart Palette extraction, Google Fonts preloading,
 * magnetic snapping, and story typography/animation styling.
 */

export const GRADIENT_PRESETS = [
  'linear-gradient(180deg, #181824 0%, #0b0c10 100%)',
  'linear-gradient(180deg, #2d124d 0%, #110726 100%)',
  'linear-gradient(180deg, #093028 0%, #021612 100%)',
  'linear-gradient(180deg, #1f2937 0%, #111827 100%)',
  'linear-gradient(180deg, #4c0519 0%, #1f020a 100%)',
  'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
  'linear-gradient(180deg, #1e3a8a 0%, #0f172a 100%)',
  'linear-gradient(180deg, #431407 0%, #1c0a00 100%)',
];

export const COLOR_PALETTE = [
  '#ffffff', // White
  '#000000', // Black
  '#5865f2', // Discord Blurple
  '#ec4899', // Neon Pink
  '#f43f5e', // Crimson Red
  '#f97316', // Sunset Orange
  '#eab308', // Amber Gold
  '#10b981', // Emerald Green
  '#06b6d4', // Electric Cyan
  '#3b82f6', // Royal Blue
  '#a855f7', // Vivid Purple
  '#64748b', // Slate Gray
];

export const STORY_FONTS = [
  { id: 'modern', label: 'Modern', family: 'system-ui, -apple-system, sans-serif' },
  { id: 'classic', label: 'Classic', family: "'Montserrat', sans-serif" },
  { id: 'signature', label: 'Signature', family: "'Caveat', cursive, serif" },
  { id: 'neon', label: 'Neon', family: "'Monoton', cursive, sans-serif" },
  { id: 'typewriter', label: 'Typewriter', family: "'Courier Prime', monospace" },
  { id: 'cyberpunk', label: 'Cyberpunk', family: "'Orbitron', monospace, sans-serif" },
  { id: 'poster', label: 'Poster', family: "'Russo One', sans-serif" },
] as const;

export type StoryFontId = (typeof STORY_FONTS)[number]['id'];

export const STORY_ANIMATIONS = [
  { id: 'none', label: 'None' },
  { id: 'typewriter', label: 'Typewriter' },
  { id: 'float', label: 'Float' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'glow', label: 'Glow' },
  { id: 'wave', label: 'Wave' },
] as const;

export type StoryAnimationId = (typeof STORY_ANIMATIONS)[number]['id'];

/**
 * Dynamically injects Google Fonts link into document.head and waits for fonts to load
 * to prevent FOUT / FOIT.
 */
export async function preloadStoryFonts(): Promise<void> {
  if (typeof document === 'undefined') return;

  const fontLinkId = 'story-google-fonts-link';
  if (!document.getElementById(fontLinkId)) {
    const link = document.createElement('link');
    link.id = fontLinkId;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Courier+Prime:wght@700&family=Monoton&family=Montserrat:wght@800;900&family=Orbitron:wght@700;900&family=Russo+One&display=swap';
    document.head.appendChild(link);
  }

  try {
    if (document.fonts && document.fonts.load) {
      await Promise.allSettled([
        document.fonts.load('16px Caveat'),
        document.fonts.load('16px "Courier Prime"'),
        document.fonts.load('16px Monoton'),
        document.fonts.load('16px Montserrat'),
        document.fonts.load('16px Orbitron'),
        document.fonts.load('16px "Russo One"'),
      ]);
      await document.fonts.ready;
    }
  } catch {
    // Graceful fallback if offline or blocked
  }
}

/**
 * Smart Palette: extracts dominant top & bottom color from an image File or URL.
 * Produces an Apple-style vertical linear gradient.
 * Protected against CORS / Canvas Tainting.
 */
export async function extractDominantGradient(source: File | string): Promise<string> {
  return new Promise((resolve) => {
    let objectUrl: string | null = null;
    let imageSrc = '';
    let isSettled = false;

    if (source instanceof File) {
      objectUrl = URL.createObjectURL(source);
      imageSrc = objectUrl;
    } else {
      imageSrc = source;
    }

    const cleanup = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };

    const safeResolve = (val: string) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      resolve(val);
    };

    // Safety timeout: if image stalls or in headless environment, fallback in 1 second
    const timer = setTimeout(() => {
      safeResolve(GRADIENT_PRESETS[0]);
    }, 1000);

    const img = new Image();
    // Enable crossOrigin for external images if supported
    if (!(source instanceof File)) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          safeResolve(GRADIENT_PRESETS[0]);
          return;
        }

        const size = 16;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size).data;

        // Sample top half average (rows 0 to size/2)
        let topR = 0,
          topG = 0,
          topB = 0,
          topCount = 0;
        for (let y = 0; y < size / 2; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            topR += imgData[idx];
            topG += imgData[idx + 1];
            topB += imgData[idx + 2];
            topCount++;
          }
        }
        topR = Math.round((topR / topCount) * 0.75); // slight tone down for ambient depth
        topG = Math.round((topG / topCount) * 0.75);
        topB = Math.round((topB / topCount) * 0.75);

        // Sample bottom half average (rows size/2 to size)
        let botR = 0,
          botG = 0,
          botB = 0,
          botCount = 0;
        for (let y = size / 2; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            botR += imgData[idx];
            botG += imgData[idx + 1];
            botB += imgData[idx + 2];
            botCount++;
          }
        }
        botR = Math.round((botR / botCount) * 0.4); // darker bottom for Instagram look
        botG = Math.round((botG / botCount) * 0.4);
        botB = Math.round((botB / botCount) * 0.4);

        safeResolve(
          `linear-gradient(180deg, rgb(${topR}, ${topG}, ${topB}) 0%, rgb(${botR}, ${botG}, ${botB}) 100%)`,
        );
      } catch {
        // Tainted canvas or reading error fallback
        safeResolve(GRADIENT_PRESETS[0]);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      safeResolve(GRADIENT_PRESETS[0]);
    };

    img.src = imageSrc;
  });
}

/**
 * Snaps position to center X or center Y when within tolerance percentage.
 */
export function snapPosition(
  x: number,
  y: number,
  tolerance = 2.5,
): { x: number; y: number; snapX: boolean; snapY: boolean } {
  let snapX = false;
  let snapY = false;
  let finalX = x;
  let finalY = y;

  if (Math.abs(x - 50) <= tolerance) {
    finalX = 50;
    snapX = true;
  }
  if (Math.abs(y - 50) <= tolerance) {
    finalY = 50;
    snapY = true;
  }

  return { x: finalX, y: finalY, snapX, snapY };
}

/**
 * Snaps rotation degrees to key angles: 0°, ±90°, ±180° with tolerance threshold.
 */
export function snapRotation(deg: number, tolerance = 4.5): { deg: number; isSnapped: boolean } {
  // Normalize into [-180, 180]
  let normalized = deg % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;

  const targets = [-180, -90, 0, 90, 180];
  for (const t of targets) {
    if (Math.abs(normalized - t) <= tolerance) {
      return { deg: t, isSnapped: true };
    }
  }

  return { deg: normalized, isSnapped: false };
}

/**
 * Returns CSS font-family string corresponding to the story font ID.
 */
export function getStoryFontFamily(id?: string): string {
  switch (id) {
    case 'classic':
      return "'Montserrat', system-ui, sans-serif";
    case 'signature':
      return "'Caveat', cursive, serif";
    case 'neon':
      return "'Monoton', cursive, sans-serif";
    case 'typewriter':
      return "'Courier Prime', monospace";
    case 'cyberpunk':
      return "'Orbitron', monospace, sans-serif";
    case 'poster':
      return "'Russo One', sans-serif";
    case 'serif':
      return 'serif';
    case 'sans':
    case 'modern':
    default:
      return "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }
}
