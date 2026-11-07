import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('native UX preserves tray lifecycle, deep links, IPC isolation and window state', async () => {
  test.setTimeout(120000);
  const userData = await mkdtemp(join(tmpdir(), 'eternal-native-ux-'));
  await writeFile(
    join(userData, 'window-state.json'),
    JSON.stringify({ x: 80, y: 60, width: 960, height: 700, maximized: false }),
  );
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  env.NODE_ENV = 'production';
  env.ETERNAL_DESKTOP_LOCAL_RENDERER = '0';
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${userData}`, 'ETERNAL://messages/startup'],
    cwd: process.cwd(),
    env,
  });
  try {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    expect(await page.evaluate(() => window.desktop?.waitForNavigation())).toBe(
      '/messages/startup',
    );
    const setup = await app.evaluate(async ({ BrowserWindow, Menu }) => {
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) throw new Error('Missing window');
      const bounds = window.getNormalBounds();
      await window.webContents.session.protocol.handle(
        'https',
        () =>
          new Response(
            '<!doctype html><html lang="uk"><title>Native UX fixture</title><textarea spellcheck="true">eternalll</textarea></html>',
            { headers: { 'Content-Type': 'text/html' } },
          ),
      );
      await window.loadURL('https://eternalnet.vercel.app/desktop-native-fixture');
      return { bounds, menu: Menu.getApplicationMenu()?.items.map((item) => item.label) };
    });
    expect(setup.bounds.width).toBe(960);
    expect(Math.abs(setup.bounds.height - 700)).toBeLessThanOrEqual(8);
    expect(setup.menu).toContain('Edit');
    const badges = await app.evaluate(async ({ app, BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) throw new Error('Missing window');
      const originalBadge = app.setBadgeCount;
      const originalOverlay = window.setOverlayIcon;
      const counts: number[] = [];
      const descriptions: string[] = [];
      app.setBadgeCount = (count = 0) => {
        counts.push(count);
        return true;
      };
      window.setOverlayIcon = (icon, description) => {
        descriptions.push(icon ? description : 'clear');
      };
      try {
        await window.webContents.executeJavaScript('window.desktop.setBadgeCount(7)');
        await window.webContents.executeJavaScript('window.desktop.resetNativeState()');
        return {
          counts,
          descriptions,
          spellcheck: window.webContents.session.isSpellCheckerEnabled(),
        };
      } finally {
        app.setBadgeCount = originalBadge;
        window.setOverlayIcon = originalOverlay;
      }
    });
    expect(badges.counts).toEqual([7, 0]);
    expect(badges.spellcheck).toBe(true);
    if (process.platform === 'win32')
      expect(badges.descriptions).toEqual(['7 unread notifications', 'clear']);
    await expect(page.evaluate(() => window.desktop?.setBadgeCount(-1))).rejects.toThrow();
    await expect(
      page.evaluate(() =>
        window.desktop?.showNotification({ title: 'Test', body: '', path: '//evil.example' }),
      ),
    ).rejects.toThrow();
    const notification = await app.evaluate(async ({ BrowserWindow, Notification }) => {
      const original = Notification.prototype.show;
      Notification.prototype.show = function () {
        this.emit('click');
      };
      try {
        const result: unknown =
          await BrowserWindow.getAllWindows()[0]?.webContents.executeJavaScript(
            "window.desktop.showNotification({ title: 'Native UX test', body: '', path: '/messages/clicked', tag: 'test' })",
          );
        return result;
      } finally {
        Notification.prototype.show = original;
      }
    });
    if (notification)
      expect(await page.evaluate(() => window.desktop?.waitForNavigation())).toBe(
        '/messages/clicked',
      );
    await app.evaluate(({ powerMonitor }) => {
      powerMonitor.emit('lock-screen');
    });
    expect(await page.evaluate(() => window.desktop?.getIdleState())).toBe('locked');
    await app.evaluate(({ powerMonitor }) => {
      powerMonitor.emit('unlock-screen');
    });
    expect(await page.evaluate(() => window.desktop?.getIdleState())).not.toBe('locked');
    const hidden = await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      window?.close();
      return { count: BrowserWindow.getAllWindows().length, visible: window?.isVisible() };
    });
    expect(hidden).toEqual({ count: 1, visible: false });
    await app.evaluate(({ app }) => {
      app.emit(
        'second-instance',
        {},
        ['eternal', 'eternal://messages/second?messageId=one'],
        '',
        {},
      );
    });
    expect(await page.evaluate(() => window.desktop?.waitForNavigation())).toBe(
      '/messages/second?messageId=one',
    );
    expect(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible()),
    ).toBe(true);
    expect(page.url()).toBe('https://eternalnet.vercel.app/desktop-native-fixture');
    const resized = await app.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      window?.setSize(1000, 720);
      window?.close();
      return window?.getNormalBounds();
    });
    const state: unknown = JSON.parse(await readFile(join(userData, 'window-state.json'), 'utf8'));
    expect(state).toMatchObject({ ...resized, maximized: false });
    await app.evaluate(async ({ BrowserWindow }) => {
      await BrowserWindow.getAllWindows()[0]?.loadURL('data:text/html,<h1>Untrusted</h1>');
    });
    for (const operation of [
      'getIdleState',
      'waitForNavigation',
      'resetNativeState',
      'getUpdateState',
      'checkForUpdates',
      'downloadUpdate',
      'installUpdate',
      'openUpdateDownload',
    ] as const) {
      await expect(
        page.evaluate(async (method) => {
          await window.desktop?.[method]?.();
        }, operation),
      ).rejects.toThrow('Unauthorized');
    }
    await expect(page.evaluate(() => window.desktop?.setUpdateChannel?.('beta'))).rejects.toThrow(
      'Unauthorized',
    );
    await expect(page.evaluate(() => window.desktop?.setBadgeCount(1))).rejects.toThrow(
      'Unauthorized',
    );
    await expect(
      page.evaluate(() =>
        window.desktop?.showNotification({ title: 'Test', body: '', path: '/notifications' }),
      ),
    ).rejects.toThrow('Unauthorized');
  } finally {
    await app.close();
    await rm(userData, { recursive: true, force: true });
  }
});
