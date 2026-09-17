import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isNotificationSupported,
  registerServiceWorker,
  requestPushNotificationPermission,
  showBrowserPushNotification,
} from '../browserPushNotifications';

describe('browserPushNotifications', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isNotificationSupported', () => {
    it('returns true when Notification is available in window', () => {
      vi.stubGlobal('Notification', class MockNotification {});
      expect(isNotificationSupported()).toBe(true);
    });

    it('returns false when Notification is not in window', () => {
      vi.stubGlobal('Notification', undefined);
      expect(isNotificationSupported()).toBe(false);
    });
  });

  describe('registerServiceWorker', () => {
    it('registers service worker successfully', async () => {
      const registerMock = vi.fn().mockResolvedValue({ scope: '/' });
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: registerMock },
        configurable: true,
      });

      const res = await registerServiceWorker();
      expect(registerMock).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      expect(res).toEqual({ scope: '/' });
    });

    it('handles registration failure gracefully', async () => {
      const registerMock = vi.fn().mockRejectedValue(new Error('SW failed'));
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: registerMock },
        configurable: true,
      });

      const res = await registerServiceWorker();
      expect(res).toBeNull();
    });

    it('returns null if serviceWorker not in navigator', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      });
      const res = await registerServiceWorker();
      expect(res).toBeNull();
    });
  });

  describe('requestPushNotificationPermission', () => {
    it('returns denied if not supported', async () => {
      vi.stubGlobal('Notification', undefined);
      const res = await requestPushNotificationPermission();
      expect(res).toBe('denied');
    });

    it('requests permission and registers SW on granted', async () => {
      const registerMock = vi.fn().mockResolvedValue({ scope: '/' });
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: registerMock },
        configurable: true,
      });

      const MockNotif = {
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };
      vi.stubGlobal('Notification', MockNotif);

      const res = await requestPushNotificationPermission();
      expect(res).toBe('granted');
      expect(registerMock).toHaveBeenCalled();
    });

    it('handles error in requestPermission', async () => {
      const MockNotif = {
        requestPermission: vi.fn().mockRejectedValue(new Error('Permission err')),
      };
      vi.stubGlobal('Notification', MockNotif);

      const res = await requestPushNotificationPermission();
      expect(res).toBe('denied');
    });
  });

  describe('showBrowserPushNotification', () => {
    it('does nothing if not supported or not granted', async () => {
      const MockNotif = {
        permission: 'denied',
      };
      vi.stubGlobal('Notification', MockNotif);

      await expect(
        showBrowserPushNotification({ title: 'Test', body: 'Msg' }),
      ).resolves.toBeUndefined();
    });

    it('uses service worker showNotification when available', async () => {
      const showNotificationMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue({
            showNotification: showNotificationMock,
          }),
        },
        configurable: true,
      });

      const MockNotif = {
        permission: 'granted',
      };
      vi.stubGlobal('Notification', MockNotif);

      await showBrowserPushNotification({
        title: 'New Post',
        body: 'User posted',
        icon: '/custom.png',
        url: '/post/123',
        tag: 'post-123',
      });

      expect(showNotificationMock).toHaveBeenCalledWith('New Post', {
        body: 'User posted',
        icon: '/custom.png',
        badge: '/favicon.ico',
        tag: 'post-123',
        data: { url: '/post/123' },
      });
    });

    it('falls back to window.Notification when SW is null or throws', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockRejectedValue(new Error('No SW')),
        },
        configurable: true,
      });

      const notifInstance: any = {};
      const NotifConstructor = vi.fn().mockImplementation((title, options) => {
        notifInstance.title = title;
        notifInstance.options = options;
        return notifInstance;
      });
      (NotifConstructor as any).permission = 'granted';
      vi.stubGlobal('Notification', NotifConstructor);

      const focusSpy = vi.spyOn(window, 'focus').mockImplementation(() => {});

      await showBrowserPushNotification({
        title: 'Direct Notif',
        body: 'Direct body',
        url: '/chat',
      });

      expect(NotifConstructor).toHaveBeenCalledWith('Direct Notif', {
        body: 'Direct body',
        icon: '/favicon.ico',
        tag: 'eternal-notif',
      });

      // Test onclick handler
      const originalLocation = window.location;
      const locationMock = { href: '' };
      Object.defineProperty(window, 'location', {
        value: locationMock,
        writable: true,
        configurable: true,
      });

      notifInstance.onclick();
      expect(focusSpy).toHaveBeenCalled();
      expect(locationMock.href).toBe('/chat');

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('catches notification construction error gracefully', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      });

      const NotifConstructor = vi.fn().mockImplementation(() => {
        throw new Error('Not allowed');
      });
      (NotifConstructor as any).permission = 'granted';
      vi.stubGlobal('Notification', NotifConstructor);

      await expect(
        showBrowserPushNotification({ title: 'Test', body: 'Msg' }),
      ).resolves.toBeUndefined();
    });

    it('falls back to window.Notification when SW getRegistration returns null (covers line 66 if branch)', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue(null), // no registration found
        },
        configurable: true,
      });

      const notifInstance: any = {};
      const NotifConstructor = vi.fn().mockImplementation(() => notifInstance);
      (NotifConstructor as any).permission = 'granted';
      vi.stubGlobal('Notification', NotifConstructor);

      await showBrowserPushNotification({
        title: 'Fallback Test',
        body: 'No SW found',
      });

      expect(NotifConstructor).toHaveBeenCalledWith('Fallback Test', {
        body: 'No SW found',
        icon: '/favicon.ico',
        tag: 'eternal-notif',
      });
    });

    it('covers onclick handler without url (line 91 false branch)', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          getRegistration: vi.fn().mockResolvedValue(null),
        },
        configurable: true,
      });

      const notifInstance: any = {};
      const NotifConstructor = vi.fn().mockImplementation(() => notifInstance);
      (NotifConstructor as any).permission = 'granted';
      vi.stubGlobal('Notification', NotifConstructor);

      const focusSpy = vi.spyOn(window, 'focus').mockImplementation(() => {});

      await showBrowserPushNotification({
        title: 'No URL Notif',
        body: 'Click without URL',
        // no url provided
      });

      // Trigger onclick without url - should call window.focus but not set href
      if (notifInstance.onclick) {
        notifInstance.onclick();
      }
      expect(focusSpy).toHaveBeenCalled();
    });

    it('covers requestPermission returning non-granted (covers line 33 false branch)', async () => {
      const registerMock = vi.fn();
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: registerMock },
        configurable: true,
      });

      const MockNotif = {
        requestPermission: vi.fn().mockResolvedValue('denied'),
      };
      vi.stubGlobal('Notification', MockNotif);

      const res = await requestPushNotificationPermission();
      expect(res).toBe('denied');
      // registerServiceWorker should NOT have been called
      expect(registerMock).not.toHaveBeenCalled();
    });
  });
});
