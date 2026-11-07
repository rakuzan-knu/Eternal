import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Session } from 'electron';
import { APP_ORIGIN } from './constants';
import { localHeaders } from './csp';
import { routeTable } from './generated/routeTable';

const routes = routeTable.map((route) => ({ ...route, matcher: new RegExp(route.pattern) }));

export function isNetworkRoute(pathname: string): boolean {
  return routes.find((route) => route.matcher.test(pathname))?.external ?? false;
}

function isWithin(root: string, file: string): boolean {
  const path = relative(root, file);
  return path !== '..' && !path.startsWith('..\\') && !path.startsWith('../') && !isAbsolute(path);
}

export async function resolveLocalFile(root: string, pathname: string): Promise<string | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!decoded.startsWith('/') || /[\\:]/.test(decoded) || decoded.includes('\0')) return null;
  const candidate = resolve(root, `.${decoded}`);
  if (!isWithin(root, candidate)) return null;
  try {
    const actual = await realpath(candidate);
    if (!isWithin(root, actual) || !(await stat(actual)).isFile()) return null;
    return actual;
  } catch {
    return null;
  }
}

export function createProtocolHandler(session: Pick<Session, 'fetch'>, root: string, csp: string) {
  const forward = (request: Request) =>
    session.fetch(request, { bypassCustomProtocolHandlers: true });
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (url.origin !== APP_ORIGIN || isNetworkRoute(url.pathname)) return forward(request);
    if (request.method !== 'GET' && request.method !== 'HEAD') return forward(request);
    let file = await resolveLocalFile(root, url.pathname);
    if (!file && request.headers.get('sec-fetch-mode') === 'navigate') {
      file = await resolveLocalFile(root, '/index.html');
    }
    if (!file) return forward(request);
    const headers = new Headers();
    const range = request.headers.get('range');
    if (range) headers.set('Range', range);
    const response = await session.fetch(pathToFileURL(file).href, {
      method: request.method,
      headers,
      bypassCustomProtocolHandlers: true,
    });
    const resultHeaders = new Headers(response.headers);
    localHeaders(url.pathname, csp).forEach((value, key) => resultHeaders.set(key, value));
    return new Response(request.method === 'HEAD' ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resultHeaders,
    });
  };
}
