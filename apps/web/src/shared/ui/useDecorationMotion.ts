import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
let media: MediaQueryList | undefined;
const emit = () => listeners.forEach((listener) => listener());
function subscribe(listener: () => void) {
  if (!listeners.size) {
    media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    media?.addEventListener('change', emit);
    document.addEventListener('visibilitychange', emit);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      media?.removeEventListener('change', emit);
      document.removeEventListener('visibilitychange', emit);
      media = undefined;
    }
  };
}
function snapshot() {
  return (
    !document.hidden && !(media ?? window.matchMedia?.('(prefers-reduced-motion: reduce)'))?.matches
  );
}

// A long chat shares one media-query listener and one tab-visibility listener.
export function useDecorationMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
