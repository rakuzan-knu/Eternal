/**
 * Call PiP Radial Circle Transition Engine
 *
 * Provides a 60 FPS GPU-accelerated circular reveal / collapse animation
 * between the full-screen CallModal and the floating in-site PiP widget.
 * Based on the Chromium View Transitions API with seamless fallbacks.
 */

export interface PiPTransitionOrigin {
  x: number;
  y: number;
}

let lastPiPCenter: PiPTransitionOrigin | null = null;

export function setPiPLastCenter(center: PiPTransitionOrigin | null): void {
  lastPiPCenter = center;
}

export function getPiPLastCenter(): PiPTransitionOrigin {
  if (lastPiPCenter && typeof window !== 'undefined') {
    const x = Math.max(90, Math.min(window.innerWidth - 90, lastPiPCenter.x));
    const y = Math.max(90, Math.min(window.innerHeight - 90, lastPiPCenter.y));
    return { x, y };
  }
  const isBrowser = typeof window !== 'undefined';
  return {
    x: isBrowser ? Math.round(window.innerWidth - 110) : 100,
    y: isBrowser ? Math.round(window.innerHeight - 174) : 100,
  };
}

export function triggerCallPiPTransition(
  mode: 'expand' | 'minimize',
  origin?: PiPTransitionOrigin | null,
  applyChange?: () => void,
): void {
  // Mobile tactile feedback
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([12, 24]);
    } catch {}
  }

  if (!applyChange) return;

  // In test environment, execute state update immediately
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    applyChange();
    return;
  }

  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (!isBrowser) {
    applyChange();
    return;
  }

  // Target coordinates for circle center (defaults to bottom-right PiP location)
  const center = origin ?? getPiPLastCenter();
  const x = center.x;
  const y = center.y;

  if ('startViewTransition' in document) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const endRadius = Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y)));

    const activeClass = mode === 'expand' ? 'pip-expanding' : 'pip-minimizing';
    document.documentElement.classList.add('pip-transitioning', activeClass);
    const cleanUp = () => {
      document.documentElement.classList.remove(
        'pip-transitioning',
        'pip-expanding',
        'pip-minimizing',
      );
    };

    let transition: { ready: Promise<void>; finished?: Promise<void> };
    try {
      transition = (
        document as unknown as {
          startViewTransition: (callback: () => void) => {
            ready: Promise<void>;
            finished?: Promise<void>;
          };
        }
      ).startViewTransition(() => {
        applyChange();
      });
    } catch {
      cleanUp();
      applyChange();
      return;
    }

    if (transition.finished) {
      transition.finished.finally(cleanUp);
    }

    transition.ready
      .then(() => {
        if (mode === 'expand') {
          // Circle bursts outward from the PiP location to reveal fullscreen CallModal
          const anim = document.documentElement.animate(
            {
              clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
            },
            {
              duration: 380,
              easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
              pseudoElement: '::view-transition-new(root)',
            },
          );
          anim.onfinish = cleanUp;
          anim.oncancel = cleanUp;
        } else {
          // Circle collapses from fullscreen down into the PiP location
          const anim = document.documentElement.animate(
            {
              clipPath: [`circle(${endRadius}px at ${x}px ${y}px)`, `circle(0px at ${x}px ${y}px)`],
            },
            {
              duration: 340,
              easing: 'cubic-bezier(0.2, 0.8, 0.25, 1)',
              pseudoElement: '::view-transition-old(root)',
            },
          );
          anim.onfinish = cleanUp;
          anim.oncancel = cleanUp;
        }
      })
      .catch(() => {
        cleanUp();
        applyChange();
      });

    return;
  }

  // Fallback for browsers without View Transitions API
  applyChange();
}
