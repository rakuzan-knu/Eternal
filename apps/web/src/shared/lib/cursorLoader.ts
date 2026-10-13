let generation = 0;
let runtime: typeof import('./cursorEngine') | undefined;
let loading: Promise<typeof import('./cursorEngine')> | undefined;

/** Default cursors never download the custom renderer or its image catalog. */
export function applyCursorToDOM(
  enabled: boolean,
  presetId: string,
  variantId = '',
  size = 32,
): void {
  if (typeof document === 'undefined') return;
  const current = ++generation;
  if (!enabled || presetId === 'default') {
    const root = document.documentElement;
    root.removeAttribute('data-custom-cursor');
    root.removeAttribute('data-cursor-id');
    for (const state of ['default', 'pointer', 'text', 'grab', 'grabbing', 'not-allowed']) {
      root.style.removeProperty(`--custom-cursor-${state}`);
    }
    return;
  }
  if (runtime) {
    runtime.applyCursorToDOM(enabled, presetId, variantId, size);
    return;
  }
  loading ??= import('./cursorEngine');
  void loading
    .then((module) => {
      runtime = module;
      if (current === generation) module.applyCursorToDOM(enabled, presetId, variantId, size);
    })
    .catch(() => {
      loading = undefined;
    });
}
