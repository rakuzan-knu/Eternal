import { shell, type WebContents } from 'electron';
import { externalUrlSchema } from '../shared/ipcContract';
import { createOAuthPopupHandler } from './oauth';

export function isTrustedUrl(value: string, origin: string): boolean {
  try {
    const url = new URL(value);
    return url.origin === origin && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function openExternal(value: string): Promise<void> {
  const url = externalUrlSchema.parse(value);
  await shell.openExternal(url);
}

export function secureWebContents(contents: WebContents, origin: string): void {
  const openOAuthPopup = createOAuthPopupHandler(contents, origin);
  contents.on('will-attach-webview', (event) => event.preventDefault());
  contents.on('will-navigate', (event, url) => {
    if (isTrustedUrl(url, origin)) return;
    event.preventDefault();
    if (externalUrlSchema.safeParse(url).success) {
      void openExternal(url).catch(() => console.error('External navigation failed'));
    }
  });
  contents.on('will-redirect', (event, url, _inPlace, isMainFrame) => {
    if (isMainFrame && !isTrustedUrl(url, origin)) event.preventDefault();
  });
  contents.setWindowOpenHandler((details) => {
    const { url, referrer } = details;
    if (!isTrustedUrl(contents.mainFrame.url, origin)) return { action: 'deny' };
    if (referrer.url && !isTrustedUrl(referrer.url, origin)) return { action: 'deny' };
    const popup = openOAuthPopup(details);
    if (popup) return popup;
    if (isTrustedUrl(url, origin)) {
      void contents.loadURL(url).catch(() => console.error('Internal navigation failed'));
    } else if (externalUrlSchema.safeParse(url).success) {
      void openExternal(url).catch(() => console.error('External navigation failed'));
    }
    return { action: 'deny' };
  });
}
