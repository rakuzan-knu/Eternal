/**
 * Browser Web Push & Native Notification Service
 */

import { getDesktopBridge, isDesktop } from './platform';

export function isNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.Notification !== 'undefined' &&
    Boolean(window.Notification)
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (isDesktop() || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.debug('ServiceWorker registration skipped or unsupported in environment', err);
    return null;
  }
}

export async function requestPushNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
    }
    return permission;
  } catch (err) {
    console.debug('Failed to request notification permission', err);
    return 'denied';
  }
}

export interface ShowBrowserPushOptions {
  title: string;
  body: string;
  icon?: string | null;
  url?: string;
  tag?: string;
}

export async function showBrowserPushNotification({
  title,
  body,
  icon,
  url,
  tag,
}: ShowBrowserPushOptions): Promise<void> {
  const desktop = getDesktopBridge();
  if (desktop?.showNotification) {
    try {
      const destination = new URL(url || '/notifications', window.location.origin);
      if (destination.origin !== window.location.origin) return;
      await desktop.showNotification({
        title: title.slice(0, 256),
        body: body.slice(0, 4096),
        path: `${destination.pathname}${destination.search}${destination.hash}`,
        tag: tag?.slice(0, 256),
      });
    } catch {
      console.debug('Desktop notification unavailable');
    }
    return;
  }
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  // If Service Worker is available, use showNotification for background OS push support
  if (!isDesktop() && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, {
          body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: tag || 'eternal-notif',
          data: { url: url || '/notifications' },
        });
        return;
      }
    } catch {
      // Fallback to standard Window Notification
    }
  }

  // Fallback to standard window Notification
  try {
    const notif = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      tag: tag || 'eternal-notif',
    });

    notif.onclick = () => {
      window.focus();
      if (url && typeof window !== 'undefined') {
        window.location.href = url;
      }
    };
  } catch {
    // Autoplay or notification construction error suppressed
  }
}
