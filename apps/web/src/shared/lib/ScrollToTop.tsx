import { useCallback, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { registerSessionResetHandler } from '@/shared/model/resetSession';

const MAX_SAVED_POSITIONS = 50;
const RESTORE_TIMEOUT_MS = 5000;

function scrollToPosition(top: number, left: number) {
  const options: ScrollToOptions = { top, left, behavior: 'instant' };
  window.scrollTo(options);
  document.documentElement.scrollTo?.(options);
  document.body.scrollTo?.(options);
}

/**
 * Global ScrollToTop Component
 * New navigation starts at the top; browser Back/Forward restores the entry's
 * position once lazy content and virtualized lists provide sufficient height.
 */
export function ScrollToTop() {
  const { key, pathname, search, hash } = useLocation();
  const navigationType = useNavigationType();
  const positions = useRef(new Map<string, { top: number; left: number }>());
  const activeKey = useRef(key);
  const restoreFrame = useRef<number | null>(null);
  const restoreObserver = useRef<ResizeObserver | null>(null);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRestoration = useCallback(() => {
    if (restoreFrame.current !== null) cancelAnimationFrame(restoreFrame.current);
    restoreFrame.current = null;
    restoreObserver.current?.disconnect();
    restoreObserver.current = null;
    if (restoreTimer.current !== null) clearTimeout(restoreTimer.current);
    restoreTimer.current = null;
  }, []);

  useLayoutEffect(() => {
    const savedPositions = positions.current;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    const remember = () => {
      savedPositions.delete(activeKey.current);
      savedPositions.set(activeKey.current, { top: window.scrollY, left: window.scrollX });
      if (savedPositions.size > MAX_SAVED_POSITIONS) {
        const oldestKey = savedPositions.keys().next().value;
        if (oldestKey !== undefined) savedPositions.delete(oldestKey);
      }
    };
    const onScroll = () => {
      if (restoreFrame.current === null) remember();
    };
    const beforeNavigation = () => {
      cancelRestoration();
      remember();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
        cancelRestoration();
      }
      remember();
    };

    // Snapshot before React replaces the outgoing page and its height clamps
    // scrollY. A route effect cleanup is already too late for this capture.
    window.addEventListener('scroll', onScroll);
    window.addEventListener('click', beforeNavigation, true);
    window.addEventListener('popstate', beforeNavigation, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('wheel', cancelRestoration, { passive: true });
    window.addEventListener('touchstart', cancelRestoration, { passive: true });
    window.addEventListener('pointerdown', cancelRestoration, true);
    const unregisterReset = registerSessionResetHandler(() => {
      cancelRestoration();
      savedPositions.clear();
    });

    return () => {
      cancelRestoration();
      unregisterReset();
      window.history.scrollRestoration = previousRestoration;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('click', beforeNavigation, true);
      window.removeEventListener('popstate', beforeNavigation, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('wheel', cancelRestoration);
      window.removeEventListener('touchstart', cancelRestoration);
      window.removeEventListener('pointerdown', cancelRestoration, true);
    };
  }, [cancelRestoration]);

  useLayoutEffect(() => {
    activeKey.current = key;
    if (hash) {
      const targetId = hash.replace('#', '');
      const element = document.getElementById(targetId);
      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    const saved = navigationType === 'POP' ? positions.current.get(key) : undefined;
    if (!saved || saved.top === 0) {
      scrollToPosition(0, saved?.left ?? 0);
      return;
    }

    const deadline = performance.now() + RESTORE_TIMEOUT_MS;
    let settledFrames = 0;
    const restore = () => {
      const maxScroll =
        Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) -
        window.innerHeight;
      if (maxScroll >= saved.top || performance.now() >= deadline) {
        scrollToPosition(saved.top, saved.left);
        settledFrames = Math.abs(window.scrollY - saved.top) < 1 ? settledFrames + 1 : 0;
        if (settledFrames >= 2 || performance.now() >= deadline) {
          restoreFrame.current = null;
          return;
        }
      } else {
        settledFrames = 0;
      }
      restoreFrame.current = requestAnimationFrame(restore);
    };
    // Virtual lists can finish their first frames before cached content resizes.
    // Reconcile those late layout changes within the existing bounded restore
    // window; all navigation/scroll input above cancels this observer too.
    restoreObserver.current = new ResizeObserver(() => {
      if (restoreFrame.current !== null) return;
      settledFrames = 0;
      restoreFrame.current = requestAnimationFrame(restore);
    });
    restoreObserver.current.observe(document.documentElement);
    restoreObserver.current.observe(document.body);
    restoreTimer.current = setTimeout(cancelRestoration, RESTORE_TIMEOUT_MS);
    restoreFrame.current = requestAnimationFrame(restore);
    return cancelRestoration;
  }, [key, pathname, search, hash, navigationType, cancelRestoration]);

  return null;
}

export default ScrollToTop;
