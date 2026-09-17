import React, { lazy } from 'react';

/**
 * Wraps dynamic component imports with a resilient retry mechanism.
 * Mitigates Vite HMR, network glitches, or stale deployment chunk loading errors.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  retries = 2,
  interval = 400,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await componentImport();
      } catch (error) {
        if (attempt === retries) {
          console.error(`[lazyWithRetry] Failed to load module after ${retries} retries:`, error);
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, interval * (attempt + 1)));
      }
    }
    return componentImport();
  });
}
