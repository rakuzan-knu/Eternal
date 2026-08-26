/**
 * Circular Ripple Transition Engine (Instagram x Discord x Apple Polish)
 * Creates a seamless radial expanding wave from the user's click coordinate
 * to smoothly transition the chat background to the new shared theme.
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
      navigator.vibrate([15, 40, 15]);
    } catch {
      // Ignore vibration failures
    }
  }

  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  const x = origin?.x ?? (isBrowser ? window.innerWidth / 2 : 0);
  const y = origin?.y ?? (isBrowser ? window.innerHeight / 2 : 0);

  // Modern browsers supporting View Transitions API with pseudo-elements
  if (isBrowser && 'startViewTransition' in document) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const endRadius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));

    const transition = (
      document as unknown as {
        startViewTransition: (callback: () => void) => { ready: Promise<void> };
      }
    ).startViewTransition(() => {
      applyTheme();
    });

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`],
          },
          {
            duration: 600,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        );
      })
      .catch(() => {
        applyTheme();
      });

    return;
  }

  // Fallback: create dynamic canvas/overlay ripple for browsers without native View Transitions API
  if (isBrowser) {
    const overlay = document.createElement('div');
    overlay.className = 'theme-ripple-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '9999';
    overlay.style.transition = 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
    overlay.style.opacity = '1';

    const w = window.innerWidth;
    const h = window.innerHeight;
    const maxRadius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));

    const ripple = document.createElement('div');
    ripple.style.position = 'absolute';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = '0px';
    ripple.style.height = '0px';
    ripple.style.borderRadius = '50%';
    ripple.style.transform = 'translate(-50%, -50%)';
    ripple.style.background = 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)';
    ripple.style.transition =
      'width 0.6s cubic-bezier(0.22, 1, 0.36, 1), height 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.6s ease-out';
    ripple.style.pointerEvents = 'none';

    overlay.appendChild(ripple);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      ripple.style.width = `${maxRadius * 2}px`;
      ripple.style.height = `${maxRadius * 2}px`;
      applyTheme();

      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
        }, 600);
      }, 500);
    });

    return;
  }

  applyTheme();
}
