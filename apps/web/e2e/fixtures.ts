import process from 'node:process';
import { test as base, expect, type Page, type Route } from '@playwright/test';

/**
 * Origin of the backend API. Mirrors the `apiClient.baseURL` normalization in
 * src/shared/api/httpClient.ts (trailing `/api` and slashes are stripped —
 * the backend serves its routes at the origin root). Mocks are scoped to this
 * origin because loose globs also match Vite dev-server asset URLs
 * (e.g. `/src/shared/api/httpClient.ts`) and break module loading.
 */
const API_BASE = (process.env.VITE_API_URL ?? 'http://localhost:3000')
  .replace(/\/api\/?$/, '')
  .replace(/\/v1\/?$/, '')
  .replace(/\/+$/, '');

/**
 * CORS headers helper: echoes the request origin or fallback.
 */
function getCorsHeaders(route: Route): Record<string, string> {
  const reqOrigin = route.request().headers()['origin'] || 'http://127.0.0.1:5173';
  return {
    'Access-Control-Allow-Origin': reqOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

/** Response payload for a mocked API route. */
interface MockResponse {
  status?: number;
  json?: unknown;
}

/** Fulfills a mocked API request, answering CORS preflights automatically. */
async function fulfillApi(route: Route, response: MockResponse = {}): Promise<void> {
  const headers = getCorsHeaders(route);
  if (route.request().method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers });
    return;
  }
  await route.fulfill({
    status: response.status ?? 200,
    contentType: 'application/json',
    headers,
    body: JSON.stringify(response.json ?? {}),
  });
}

/**
 * Mocks `{API_BASE}${pathPattern}`. Routes registered later win over earlier ones.
 * Automatically handles query parameters, /v1 prefixes, and host variations.
 */
async function mockApi(
  page: Page,
  pathPattern: string,
  response: MockResponse = {},
): Promise<void> {
  const handler = (route: Route) => fulfillApi(route, response);
  const cleanPattern = pathPattern.replace(/^\/v1(?=\/|$)/, '');
  const basePattern = cleanPattern.replace(/\?\*\*$/, '').replace(/\?.*$/, '');
  const rawPatterns = Array.from(new Set([cleanPattern, basePattern, `${basePattern}?**`]));

  const allPatterns = new Set<string>();
  for (const p of rawPatterns) {
    const withoutV1 = p.startsWith('/') ? p : `/${p}`;
    const withV1 = `/v1${withoutV1}`;
    allPatterns.add(withoutV1);
    allPatterns.add(withV1);
  }

  const hosts = Array.from(new Set([API_BASE, 'http://localhost:3000', 'http://127.0.0.1:3000']));

  for (const host of hosts) {
    for (const p of allPatterns) {
      await page.route(`${host}${p}`, handler);
    }
  }
}

/**
 * Default authenticated user and session tokens.
 */
const DEFAULT_AUTH_USER = {
  id: 'usr-me',
  username: 'mockme',
  displayName: 'Mock Me',
  avatar: null,
};

const AUTH_SESSION_STORAGE = JSON.stringify({
  state: { userId: 'usr-me', isAuthenticated: true },
  version: 0,
});

/**
 * Test fixture that provides a page pre-authenticated against the mocked API,
 * so guarded routes (feed, profile, chat, search, notifications) render.
 */
export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, fixtureUse) => {
    await page.addInitScript(
      ([storageKey, storageValue]) => {
        window.localStorage.setItem(storageKey as string, storageValue as string);
        window.localStorage.setItem('accessToken', 'mock-access-token');
        window.localStorage.setItem('refreshToken', 'mock-refresh-token');
      },
      ['auth-session', AUTH_SESSION_STORAGE],
    );

    // Catch-all: block unmocked backend API endpoints so they fail gracefully like a downed backend,
    // while ensuring Vite frontend dev-server chunks and assets are never blocked.
    const abortHandler = (route: Route) => {
      const url = route.request().url();
      if (url.includes(':5173') || (!url.includes(':3000') && !url.includes(API_BASE))) {
        return route.continue();
      }
      return route.abort('blockedbyclient');
    };

    await page.route(`${API_BASE}/**`, abortHandler);
    await page.route(`http://localhost:3000/**`, abortHandler);
    await page.route(`http://127.0.0.1:3000/**`, abortHandler);

    // Base background API mocks so sidebar/auth polling doesn't trigger 401 logouts
    await mockApi(page, '/auth/refresh', {
      json: { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' },
    });
    await mockApi(page, '/users/me', { json: DEFAULT_AUTH_USER });
    await mockApi(page, '/users/usr-me', { json: DEFAULT_AUTH_USER });
    await mockApi(page, '/notifications/unread-count', { json: { count: 0 } });

    await fixtureUse(page);
  },
});

export { expect, mockApi, fulfillApi };
