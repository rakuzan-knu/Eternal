import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('shared renderer starts with an isolated, sandboxed bridge', async () => {
  const info = test.info();
  const userData = await mkdtemp(join(tmpdir(), 'eternal-desktop-smoke-'));
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  environment.NODE_ENV = 'production';
  environment.ETERNAL_DESKTOP_LOCAL_RENDERER = '0';
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${userData}`],
    cwd: process.cwd(),
    env: environment,
  });
  try {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toBe('https://eternalnet.vercel.app/');
    const bridge = await page.evaluate(async () => {
      const info = await window.desktop?.getInfo();
      return {
        info,
        hasRequire: 'require' in window,
        hasProcess: 'process' in window,
        bridgeKeys: Object.keys(window.desktop ?? {}).sort(),
        hasRoot: Boolean(document.querySelector('#root')),
      };
    });
    expect(bridge.info?.platform).toBe(process.platform);
    expect(await page.evaluate(() => window.desktop?.getUpdateState?.())).toMatchObject({
      mode: 'disabled',
      required: false,
    });
    await expect(page.evaluate(() => window.desktop?.downloadUpdate?.())).rejects.toThrow(
      'unavailable',
    );
    await expect(page.evaluate(() => window.desktop?.installUpdate?.())).rejects.toThrow(
      'not ready',
    );
    await expect(
      page.evaluate(() =>
        Reflect.apply(window.desktop!.setUpdateChannel!, window.desktop, ['nightly']),
      ),
    ).rejects.toThrow();
    expect(bridge.hasRequire).toBe(false);
    expect(bridge.hasProcess).toBe(false);
    expect(bridge.hasRoot).toBe(true);
    await expect(page.locator('#root')).not.toBeEmpty();
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible()),
      )
      .toBe(true);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await page.screenshot({ path: info.outputPath('renderer.png') });
    expect(bridge.bridgeKeys).toEqual([
      'cancelYouTube',
      'checkForUpdates',
      'configurePushToTalk',
      'connectYouTube',
      'downloadUpdate',
      'getIdleState',
      'getInfo',
      'getUpdateState',
      'installUpdate',
      'openExternal',
      'openUpdateDownload',
      'resetNativeState',
      'setBadgeCount',
      'setCallActive',
      'setUpdateChannel',
      'showNotification',
      'telemetryDisabled',
      'waitForCallAction',
      'waitForNavigation',
    ]);
    await expect(
      page.evaluate(() => window.desktop?.openExternal('file:///etc/passwd')),
    ).rejects.toThrow();
    await page.evaluate(() => {
      window.open('javascript:alert(1)');
    });
    expect(await app.windows()).toHaveLength(1);
    const externalCalls = await app.evaluate(async ({ shell, BrowserWindow }) => {
      const original = shell.openExternal;
      const calls: string[] = [];
      shell.openExternal = async (url) => {
        calls.push(url);
      };
      try {
        await BrowserWindow.getAllWindows()[0]?.webContents.executeJavaScript(
          "window.open('https://example.org/', '_blank', 'noopener,noreferrer'); void 0",
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
        return calls;
      } finally {
        shell.openExternal = original;
      }
    });
    expect(externalCalls).toEqual(['https://example.org/']);
    await app.evaluate(async ({ BrowserWindow }) => {
      await BrowserWindow.getAllWindows()[0]?.loadURL('data:text/html,<h1>Untrusted</h1>');
    });
    await expect(page.evaluate(() => window.desktop?.getInfo())).rejects.toThrow('Unauthorized');
  } finally {
    await app.close();
    await rm(userData, { recursive: true, force: true });
  }
});
