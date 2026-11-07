import { app, Notification, type BrowserWindow, type NativeImage } from 'electron';
import type { DesktopNotification } from '../shared/ipcContract';

export function createNativeNotifications(
  getWindow: () => BrowserWindow | undefined,
  navigate: (path: string) => void,
  icon: NativeImage,
) {
  const active = new Map<string, { close: () => void }>();
  let sequence = 0;
  let lastShown = 0;
  return {
    show(options: DesktopNotification): boolean {
      if (!Notification.isSupported()) return false;
      const key = options.tag || String(++sequence);
      if (!active.has(key) && Date.now() - lastShown < 1000) return false;
      active.get(key)?.close();
      if (active.size >= 5) {
        const oldest = active.entries().next().value;
        if (oldest) {
          active.delete(oldest[0]);
          oldest[1].close();
        }
      }
      const notification = new Notification({
        title: options.title,
        body: options.body,
        icon,
        silent: true,
      });
      const timeout = setTimeout(() => close(), 60000);
      const clear = () => {
        clearTimeout(timeout);
        notification.off('click', click);
        notification.off('close', clear);
        notification.off('failed', clear);
        if (active.get(key)?.close === close) active.delete(key);
      };
      const close = () => {
        clear();
        notification.close();
      };
      const click = () => {
        close();
        navigate(options.path);
      };
      notification.on('click', click);
      notification.on('close', clear);
      notification.on('failed', clear);
      active.set(key, { close });
      lastShown = Date.now();
      notification.show();
      return true;
    },
    setBadge(count: number) {
      app.setBadgeCount(count);
      if (process.platform === 'win32')
        getWindow()?.setOverlayIcon(
          count ? icon.resize({ width: 16, height: 16 }) : null,
          count ? `${count} unread notifications` : 'No unread notifications',
        );
    },
    reset() {
      for (const notification of active.values()) notification.close();
      active.clear();
      app.setBadgeCount(0);
      if (process.platform === 'win32')
        getWindow()?.setOverlayIcon(null, 'No unread notifications');
    },
  };
}
