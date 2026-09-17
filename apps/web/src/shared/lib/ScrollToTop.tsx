import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global ScrollToTop Component
 * Ensures every page navigation from navbar, footer, or in-app links resets window scroll to the top.
 */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      if (typeof document !== 'undefined') {
        if (typeof document.documentElement?.scrollTo === 'function') {
          document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
        if (typeof document.body?.scrollTo === 'function') {
          document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
      }
    } else {
      const targetId = hash.replace('#', '');
      const element = document.getElementById(targetId);
      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [pathname, search, hash]);

  return null;
}

export default ScrollToTop;
