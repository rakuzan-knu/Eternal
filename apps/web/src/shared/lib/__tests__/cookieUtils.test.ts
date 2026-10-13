import { describe, expect, it, beforeEach } from 'vitest';
import {
  COOKIE_KEYS,
  deleteCookie,
  getCookie,
  setCookie,
  syncConsentCookie,
  syncLanguageCookie,
  syncThemeCookie,
} from '../cookieUtils';

describe('cookieUtils', () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie.split(';').forEach((c) => {
      const eqPos = c.indexOf('=');
      const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  });

  it('sets and gets simple cookie', () => {
    setCookie('test_cookie', 'test_value');
    expect(getCookie('test_cookie')).toBe('test_value');
  });

  it('deletes cookie properly', () => {
    setCookie('del_test', 'to_delete');
    deleteCookie('del_test');
    expect(getCookie('del_test')).toBeNull();
  });

  it('syncs theme cookie', () => {
    syncThemeCookie('dark');
    expect(getCookie(COOKIE_KEYS.THEME)).toBe('dark');
  });

  it('syncs language cookie', () => {
    syncLanguageCookie('Українська');
    expect(getCookie(COOKIE_KEYS.LANGUAGE)).toBe('Українська');
  });

  it('syncs consent cookie with JSON serialization', () => {
    const consent = { strictlyNecessary: true, analytics: false };
    syncConsentCookie(consent);
    const retrieved = JSON.parse(getCookie(COOKIE_KEYS.CONSENT) || '{}');
    expect(retrieved).toEqual(consent);
  });
});
