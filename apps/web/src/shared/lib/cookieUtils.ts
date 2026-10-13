/**
 * Client-Side First-Party Cookie Utilities
 *
 * Used for storing non-sensitive user preferences (theme, language, cookie consent)
 * so that edge proxies, CDNs (e.g. Cloudflare), and SSR/prerender pipelines can read
 * them on initial request to prevent flash of wrong theme/language (FOUC/FOUT).
 */

export const COOKIE_KEYS = {
  THEME: 'eternal_theme',
  LANGUAGE: 'eternal_language',
  CONSENT: 'eternal_cookie_consent',
} as const;

export interface CookieOptions {
  days?: number;
  path?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const escapedName = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const match = document.cookie.match(new RegExp('(?:^|; )' + escapedName + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function setCookie(name: string, value: string, options: CookieOptions = {}): void {
  if (typeof document === 'undefined') return;
  try {
    const {
      days = 365,
      path = '/',
      sameSite = 'lax',
      secure = typeof window !== 'undefined' && window.location.protocol === 'https:',
    } = options;

    let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=${path}; samesite=${sameSite}`;

    if (days) {
      const expires = new Date(Date.now() + days * 864e5).toUTCString();
      cookieStr += `; expires=${expires}`;
    }

    if (secure) {
      cookieStr += '; secure';
    }

    document.cookie = cookieStr;
  } catch {
    // ignore
  }
}

export function deleteCookie(name: string, path = '/'): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${encodeURIComponent(name)}=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 GMT; samesite=lax`;
  } catch {
    // ignore
  }
}

export function syncThemeCookie(theme: string): void {
  setCookie(COOKIE_KEYS.THEME, theme, { days: 365 });
}

export function syncLanguageCookie(language: string): void {
  setCookie(COOKIE_KEYS.LANGUAGE, language, { days: 365 });
}

export function syncConsentCookie(consent: unknown): void {
  const serialized = typeof consent === 'string' ? consent : JSON.stringify(consent);
  setCookie(COOKIE_KEYS.CONSENT, serialized, { days: 365 });
}
