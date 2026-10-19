import { useSyncExternalStore } from 'react';
import { useVisualEffects } from '@/shared/model/useVisualEffects';

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
  if (document.hidden) return 0;
  return (media ?? window.matchMedia?.('(prefers-reduced-motion: reduce)'))?.matches ? 1 : 2;
}

// A long chat shares one media-query listener and one tab-visibility listener.
export function useDecorationMotion() {
  const motion = useVisualEffects((state) => state.motion);
  const device = useSyncExternalStore(subscribe, snapshot, () => 0);
  return device > 0 && motion !== 'reduced' && (motion === 'full' || device === 2);
}
