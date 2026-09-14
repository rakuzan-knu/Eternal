/**
 * Utility for on-demand lazy loading of Google Fonts for chat text customization.
 * Prevents heavy upfront bundle/network penalties (FCP/LCP optimization).
 */

const loadedFonts = new Set<string>();

/**
 * Loads a single font family on demand from Google Fonts with &display=swap.
 */
export function loadThemeFont(fontFamily: string, googleFontName?: string): void {
  if (typeof document === 'undefined') return;

  const fontName = googleFontName || fontFamily;
  if (
    !fontName ||
    fontName === 'Inter' ||
    fontName === 'sans-serif' ||
    fontName === 'monospace' ||
    fontName === 'serif'
  ) {
    return;
  }

  // Check if already requested or loaded
  if (loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);

  try {
    const formattedFamily = fontName.replace(/['"]/g, '').trim().replace(/ /g, '+');
    const href = `https://fonts.googleapis.com/css2?family=${formattedFamily}:wght@400;600;700;800&display=swap`;

    // Check if link tag already exists in DOM
    if (document.querySelector(`link[href*="${formattedFamily}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  } catch (err) {
    console.warn('[FontLoader] Failed to dynamically load font:', fontName, err);
  }
}

/**
 * Preloads the 12 Discord-style text fonts in a single batch request when the user
 * opens the "Text" tab in the Theme Customizer modal.
 */
export function preloadTextTabFonts(): void {
  if (typeof document === 'undefined') return;

  const BATCH_ID = 'eternal-chat-theme-fonts-batch';
  if (document.getElementById(BATCH_ID)) return;

  const fontFamilies = [
    'Playfair+Display:ital,wght@0,600;1,600',
    'Rubik+Bubbles',
    'Ruslan+Display',
    'Comfortaa:wght@700',
    'Press+Start+2P',
    'Pixelify+Sans:wght@600;700',
    'Caveat:wght@600;700',
    'Exo+2:wght@600;800',
    'JetBrains+Mono:wght@500;700',
    'Kelly+Slab',
    'Pacifico',
  ];

  try {
    const combinedHref = `https://fonts.googleapis.com/css2?${fontFamilies.map((f) => `family=${f}`).join('&')}&display=swap`;

    const link = document.createElement('link');
    link.id = BATCH_ID;
    link.rel = 'stylesheet';
    link.href = combinedHref;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);

    // Mark individual fonts as loaded
    fontFamilies.forEach((f) => {
      const baseName = f.split(':')[0].replace(/\+/g, ' ');
      loadedFonts.add(baseName);
    });
  } catch (err) {
    console.warn('[FontLoader] Failed to batch load fonts:', err);
  }
}
