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
 * Mocks `{API_BASE}${pathPattern}` (a Playwright glob; append `?**` to match
 * query strings). Routes registered later win over earlier ones.
 */
async function mockApi(
  page: Page,
  pathPattern: string,
  response: MockResponse = {},
): Promise<void> {
  const handler = (route: Route) => fulfillApi(route, response);
  await page.route(`${API_BASE}${pathPattern}`, handler);
  if (!API_BASE.includes('localhost')) {
    await page.route(`http://localhost:3000${pathPattern}`, handler);
  }
  if (!API_BASE.includes('127.0.0.1')) {
    await page.route(`http://127.0.0.1:3000${pathPattern}`, handler);
  }
}

/**
 * Payload stored by zustand `persist` in localStorage under key `auth-session`.
 * Mirrors `useAuthStore` in src/shared/model/useAuthStore.ts.
 */
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
      },
      ['auth-session', AUTH_SESSION_STORAGE],
    );
    // Catch-all: endpoints a spec does not explicitly mock fail like a downed
    // backend (network error), which the app handles gracefully. Serving a
    // generic `{}` 200 instead crashes consumers that expect typed payloads.
    const abortHandler = (route: Route) => {
      const url = route.request().url();
      if (url.includes(':5173') || url.includes('/src/') || url.includes('/@')) {
        return route.continue();
      }
      return route.abort('blockedbyclient');
    };
    await page.route(`${API_BASE}/**`, abortHandler);
    await page.route(`http://localhost:3000/**`, abortHandler);
    await page.route(`http://127.0.0.1:3000/**`, abortHandler);
    await fixtureUse(page);
  },
});

export { expect, mockApi, fulfillApi };
