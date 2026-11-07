import { internalPathSchema } from '../shared/ipcContract';

export function parseDeepLink(value: string): string | null {
  if (
    value.length > 2048 ||
    /[\\\s]/.test(value) ||
    [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  )
    return null;
  try {
    if (/(?:^|\/)(?:\.|%2e){1,2}(?:\/|[?#]|$)/i.test(value)) return null;
    const url = new URL(value);
    if (url.protocol !== 'eternal:' || url.username || url.password || url.port) return null;
    const path = `/${url.hostname}${url.pathname}${url.search}${url.hash}`;
    const parsed = internalPathSchema.safeParse(path);
    if (!parsed.success) return null;
    const pathname = new URL(parsed.data, 'https://eternal.invalid').pathname;
    if (
      !/^\/(?:messages(?:\/[^/]+)?|notifications|feed|profile(?:\/[^/]+)?|communities(?:\/[^/]+(?:\/channels\/[^/]+)?)?|reels|music(?:\/(?:playlist|track)\/[^/]+)?)\/?$/.test(
        pathname,
      )
    )
      return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function createNavigationQueue() {
  let queued: string | null = null;
  let pending: ((path: string | null) => void) | undefined;
  return {
    push(path: string) {
      internalPathSchema.parse(path);
      if (pending) pending(path);
      else queued = path;
    },
    wait(): Promise<string | null> {
      if (pending) pending(null);
      if (queued !== null) {
        const path = queued;
        queued = null;
        return Promise.resolve(path);
      }
      return new Promise((resolve) => {
        const timeout = setTimeout(() => finish(null), 15000);
        const finish = (path: string | null) => {
          clearTimeout(timeout);
          pending = undefined;
          resolve(path);
        };
        pending = finish;
      });
    },
    cancel() {
      pending?.(null);
    },
    reset() {
      pending?.(null);
      queued = null;
    },
  };
}
