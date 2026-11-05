import {
  BrowserWindow,
  type HandlerDetails,
  type WebContents,
  type WindowOpenHandlerResponse,
} from 'electron';
import vercel from '../../../../vercel.json';
import { DEV_ORIGIN } from './constants';
import { devToolsEnabled } from './policies';

const providers = {
  github: ['https://github.com'],
  spotify: ['https://accounts.spotify.com'],
  steam: ['https://steamcommunity.com', 'https://login.steampowered.com'],
  twitch: ['https://id.twitch.tv', 'https://www.twitch.tv'],
} as const;

export type OAuthProvider = keyof typeof providers;
const resets = new WeakMap<WebContents, () => void>();

export function oauthProvider(frameName: string): OAuthProvider | undefined {
  return (Object.keys(providers) as OAuthProvider[]).find(
    (provider) => frameName === `${provider}_oauth_window`,
  );
}

function parseUrl(value: string): URL | undefined {
  if (/[\\\s]/.test(value) || /%5c/i.test(value)) return;
  try {
    const url = new URL(value);
    if (!url.username && !url.password) return url;
  } catch {
    return;
  }
}

export function oauthServiceOrigin(provider: OAuthProvider | 'youtube', origin: string): string {
  if (origin === DEV_ORIGIN) return 'http://localhost:3000';
  const source = provider === 'github' ? '/auth/:path*' : '/integrations/:path*';
  const destination = vercel.rewrites.find((route) => route.source === source)?.destination;
  if (!destination?.startsWith('https://')) throw new Error('OAuth service is not configured');
  return new URL(destination).origin;
}

export function isOAuthNavigationAllowed(
  value: string,
  provider: OAuthProvider,
  origin: string,
): boolean {
  const url = parseUrl(value);
  if (!url) return false;
  if (providers[provider].some((allowed) => url.origin === allowed)) return true;
  if (url.origin !== origin && url.origin !== oauthServiceOrigin(provider, origin)) return false;
  const path = url.pathname
    .replace(/^\/(?:api\/)?v1(?=\/)/, '')
    .replace(/^\/api(?=\/)/, '')
    .replace(/\/$/, '');
  const launch =
    provider === 'github'
      ? '/auth/github/oauth/launch'
      : provider === 'steam'
        ? '/integrations/steam/launch'
        : '/integrations/oauth/launch';
  if (path === launch) return !url.search && (!url.hash || /^#[a-f0-9]{64}$/.test(url.hash));
  if (path === `/integrations/${provider}/callback` || path === `/auth/${provider}/callback`)
    return true;
  if (provider === 'spotify' && path === '/spotify/callback') return true;
  return (
    provider === 'twitch' &&
    url.origin === origin &&
    ['', '/oauth/callback', '/callback'].includes(path) &&
    (url.searchParams.has('code') || url.searchParams.has('error'))
  );
}

export function isGithubCompletion(value: string, origin: string): boolean {
  const url = parseUrl(value);
  return Boolean(
    url &&
    url.origin === origin &&
    url.pathname === '/settings' &&
    (url.searchParams.get('github') === 'connected' ||
      url.searchParams.get('error') === 'oauth_failed'),
  );
}

export function resetOAuthPopups(contents: WebContents): void {
  resets.get(contents)?.();
}

export function createOAuthPopupHandler(
  contents: WebContents,
  origin: string,
): (details: HandlerDetails) => WindowOpenHandlerResponse | undefined {
  const children = new Set<BrowserWindow>();
  const session = contents.session;
  const reset = () => {
    for (const child of children) if (!child.isDestroyed()) child.destroy();
    children.clear();
  };
  resets.set(contents, reset);
  contents.on('did-start-navigation', (_event, _url, inPlace, mainFrame) => {
    if (mainFrame && !inPlace) reset();
  });
  contents.on('render-process-gone', reset);
  contents.once('destroyed', reset);

  return ({ url, frameName }) => {
    const provider = oauthProvider(frameName);
    if (!provider) return;
    if (url !== 'about:blank') return { action: 'deny' };
    const parent = BrowserWindow.fromWebContents(contents);
    if (!parent || children.size) return { action: 'deny' };
    return {
      action: 'allow',
      createWindow: (options) => {
        const child = new BrowserWindow({
          ...options,
          parent,
          title: `Eternal — ${provider}`,
          width: 640,
          height: 750,
          minWidth: 400,
          minHeight: 500,
          show: false,
          frame: true,
          resizable: true,
          fullscreen: false,
          fullscreenable: false,
          alwaysOnTop: false,
          skipTaskbar: false,
          autoHideMenuBar: true,
          webPreferences: {
            ...options.webPreferences,
            session,
            preload: '',
            additionalArguments: [],
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false,
            nodeIntegrationInWorker: false,
            nodeIntegrationInSubFrames: false,
            webSecurity: true,
            webviewTag: false,
            allowRunningInsecureContent: false,
            navigateOnDragDrop: false,
            devTools: devToolsEnabled(),
          },
        });
        children.add(child);
        child.setMenu(null);
        const web = child.webContents;
        const trustedOpener = () =>
          !contents.isDestroyed() &&
          web.opener === contents.mainFrame &&
          parseUrl(contents.mainFrame.url)?.origin === origin;
        setImmediate(() => {
          if (child.isDestroyed()) return;
          if (trustedOpener()) child.show();
          else child.destroy();
        });
        let visitedProvider = false;
        const guard = (event: Electron.Event, target: string) => {
          if (!trustedOpener()) {
            event.preventDefault();
            return;
          }
          if (provider === 'github' && visitedProvider && isGithubCompletion(target, origin)) {
            event.preventDefault();
            child.close();
            return;
          }
          if (!isOAuthNavigationAllowed(target, provider, origin)) {
            event.preventDefault();
            return;
          }
          const parsed = parseUrl(target);
          if (parsed && providers[provider].some((allowed) => parsed.origin === allowed))
            visitedProvider = true;
        };
        web.on('will-navigate', guard);
        web.on('will-redirect', (event, target, _inPlace, mainFrame) => {
          if (mainFrame) guard(event, target);
        });
        web.on('will-attach-webview', (event) => event.preventDefault());
        web.setWindowOpenHandler(() => ({ action: 'deny' }));
        const blockDownload = (
          event: Electron.Event,
          _item: Electron.DownloadItem,
          source: WebContents,
        ) => {
          if (source === web) event.preventDefault();
        };
        session.on('will-download', blockDownload);
        child.once('closed', () => {
          children.delete(child);
          session.removeListener('will-download', blockDownload);
          if (!parent.isDestroyed() && parent.isVisible()) parent.focus();
        });
        return web;
      },
    };
  };
}
