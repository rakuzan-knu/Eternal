import type { Page } from '@playwright/test';

/** Computed solid/alpha colors only. Media/gradients/group opacity need manual review. */
export async function auditReadability(page: Page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas color conversion unavailable');
    const color = (css: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = css;
      context.fillRect(0, 0, 1, 1);
      const rgba = context.getImageData(0, 0, 1, 1).data;
      return [rgba[0], rgba[1], rgba[2], rgba[3] / 255];
    };
    const composite = (front: number[], back: number[]) =>
      front.slice(0, 3).map((channel, index) => channel * front[3] + back[index] * (1 - front[3]));
    const luminance = (rgb: number[]) =>
      rgb
        .map((channel) => {
          const s = channel / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
    const hex = (rgb: number[]) =>
      '#' +
      rgb
        .slice(0, 3)
        .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
        .join('');
    const text = [];
    const manual = [];
    const smallTargets = [];
    for (const element of document.querySelectorAll<HTMLElement>(
      'main *, [data-testid="chat-thread"] *, [role="dialog"] *',
    )) {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      if (
        !bounds.width ||
        !bounds.height ||
        style.visibility === 'hidden' ||
        element.closest('[hidden], [aria-hidden="true"], :disabled')
      )
        continue;
      // Direct text avoids measuring the same inherited text once per ancestor.
      const label = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join('')
        .trim();
      if (!label) continue;
      const parents: HTMLElement[] = [];
      for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement)
        parents.push(ancestor);
      const unsupported = parents.find((parent) => {
        const css = getComputedStyle(parent);
        return css.backgroundImage !== 'none' || Number(css.opacity) !== 1;
      });
      if (unsupported) {
        manual.push({
          text: label.slice(0, 100),
          reason: 'Gradient/image or group opacity',
          classes: unsupported.className,
        });
        continue;
      }
      let background = [0, 0, 0];
      for (const parent of parents.reverse())
        background = composite(color(getComputedStyle(parent).backgroundColor), background);
      const foreground = composite(color(style.color), background);
      const a = luminance(foreground),
        b = luminance(background);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const size = parseFloat(style.fontSize);
      const required =
        size >= 24 || (size >= 18.6667 && parseInt(style.fontWeight) >= 700) ? 3 : 4.5;
      text.push({
        text: label.slice(0, 100),
        foreground: hex(foreground),
        background: hex(background),
        ratio,
        required,
        passes: ratio >= required,
        classes: element.className,
      });
    }
    for (const element of document.querySelectorAll<HTMLElement>(
      'main button, main a, main [role="button"]',
    )) {
      const rect = element.getBoundingClientRect();
      if (
        !rect.width ||
        !rect.height ||
        element.closest('[hidden], [aria-hidden="true"], :disabled')
      )
        continue;
      if (rect.width < 24 || rect.height < 24)
        smallTargets.push({
          name:
            element.getAttribute('aria-label') ||
            element.getAttribute('title') ||
            element.textContent?.trim().slice(0, 100),
          width: rect.width,
          height: rect.height,
          classes: element.className,
        });
    }
    return {
      text,
      manual,
      smallTargets,
      method:
        'Computed CSS → browser sRGB conversion → ancestor alpha compositing; gradients/media/opacity excluded. Targets below 24 CSS px require spacing/inline exceptions review.',
    };
  });
}
