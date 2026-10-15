/** Keep portaled overlays above their opener, including legacy modal surfaces. */
export function resolveOverlayLayer(
  opener: HTMLElement | null,
  token: string,
  fallback: number,
  gap = 1,
): number {
  const tokenValue = Number.parseInt(
    getComputedStyle(document.documentElement).getPropertyValue(token),
    10,
  );
  let layer = Number.isFinite(tokenValue) ? tokenValue : fallback;
  for (let element = opener; element; element = element.parentElement) {
    const ancestorLayer = Number.parseInt(getComputedStyle(element).zIndex, 10);
    if (Number.isFinite(ancestorLayer)) layer = Math.max(layer, ancestorLayer + gap);
  }
  return layer;
}
