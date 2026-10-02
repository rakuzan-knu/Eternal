/**
 * Circular Ripple Transition Engine (Instagram x Discord x Apple Polish)
 * Creates a seamless, GPU-accelerated 60 FPS radial expanding wave
 * from the user's click/upload coordinates to smoothly transition the theme.
 */

export interface RippleOrigin {
  x: number;
  y: number;
}

export function triggerCircularRippleTransition(
  origin: RippleOrigin | null | undefined,
  applyTheme: () => void,
): void {
  // Trigger subtle haptic feedback on supported mobile devices
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([15, 30, 15]);
    } catch {
      // Ignore vibration failures
    }
  }

  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  const x = origin?.x ?? (isBrowser ? Math.round(window.innerWidth / 2) : 0);
  const y = origin?.y ?? (isBrowser ? Math.round(window.innerHeight / 2) : 0);

  // Modern browsers supporting View Transitions API with pseudo-elements
  if (isBrowser && 'startViewTransition' in document) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const endRadius = Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y)));

    // Temporarily disable standard CSS element transitions to prevent frame contention
    document.documentElement.classList.add('theme-transitioning');

    const cleanUpClass = () => {
      document.documentElement.classList.remove('theme-transitioning');
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
        applyTheme();
      });
    } catch {
      cleanUpClass();
      applyTheme();
      return;
    }

    if (transition.finished) {
      transition.finished.finally(cleanUpClass);
    }

    transition.ready
      .then(() => {
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

        anim.onfinish = cleanUpClass;
        anim.oncancel = cleanUpClass;
      })
      .catch(() => {
        cleanUpClass();
        applyTheme();
      });

    return;
  }

  // Fallback: create GPU-composited overlay ripple for browsers without native View Transitions
  if (isBrowser) {
    const overlay = document.createElement('div');
    overlay.className = 'theme-ripple-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '99999';
    overlay.style.overflow = 'hidden';
    overlay.style.transform = 'translateZ(0)';
    overlay.style.transition = 'opacity 0.38s cubic-bezier(0.16, 1, 0.3, 1)';
    overlay.style.opacity = '1';

    const w = window.innerWidth;
    const h = window.innerHeight;
    const maxRadius = Math.ceil(Math.hypot(Math.max(x, w - x), Math.max(y, h - y)));
    const baseSize = 80;
    const targetScale = (maxRadius * 2) / baseSize;

    const ripple = document.createElement('div');
    ripple.style.position = 'absolute';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = `${baseSize}px`;
    ripple.style.height = `${baseSize}px`;
    ripple.style.borderRadius = '50%';
    ripple.style.transform = 'translate(-50%, -50%) scale(0) translateZ(0)';
    ripple.style.willChange = 'transform, opacity';
    ripple.style.background =
      'radial-gradient(circle, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0.08) 55%, transparent 70%)';
    ripple.style.transition =
      'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), width 0.38s cubic-bezier(0.16, 1, 0.3, 1), height 0.38s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.38s ease-out';
    ripple.style.pointerEvents = 'none';

    overlay.appendChild(ripple);
    document.body.appendChild(overlay);

    applyTheme();

    requestAnimationFrame(() => {
      ripple.style.transform = `translate(-50%, -50%) scale(${targetScale}) translateZ(0)`;
      ripple.style.width = `${maxRadius * 2}px`;
      ripple.style.height = `${maxRadius * 2}px`;

      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
        }, 500);
      }, 400);
    });

    return;
  }

  applyTheme();
}
