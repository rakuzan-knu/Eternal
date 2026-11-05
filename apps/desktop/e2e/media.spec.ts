import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('display picker isolates previews, supports cancel/retry/keyboard, and captures a selected screen', async () => {
  test.setTimeout(120000);
  const userData = await mkdtemp(join(tmpdir(), 'eternal-desktop-media-'));
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  env.NODE_ENV = 'production';
  env.ETERNAL_DESKTOP_LOCAL_RENDERER = '0';
  const app = await electron.launch({
    args: ['.', `--user-data-dir=${userData}`, '--use-fake-device-for-media-stream'],
    cwd: process.cwd(),
    env,
  });
  try {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await app.evaluate(async ({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows()[0];
      if (!window) throw new Error('Missing main window');
      await window.webContents.session.protocol.handle(
        'https',
        () =>
          new Response(
            '<!doctype html><html lang="uk"><style>:root{--app-bg-color:#070709;--app-text-primary:#ffffff;--app-accent-color:#8b5cf6}</style><title>Local media fixture</title><button id="capture">Capture</button></html>',
            { headers: { 'Content-Type': 'text/html' } },
          ),
      );
      await window.loadURL('https://eternalnet.vercel.app/desktop-media-fixture');
    });
    await page.evaluate(() => {
      document.getElementById('capture')?.addEventListener('click', () => {
        document.body.dataset.result = 'pending';
        void navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then((stream) => {
            document.body.dataset.result = 'captured';
            document.body.dataset.video = String(stream.getVideoTracks().length);
            document.body.dataset.audio = String(stream.getAudioTracks().length);
            stream.getTracks().forEach((track) => track.stop());
          })
          .catch((error: unknown) => {
            document.body.dataset.result = error instanceof DOMException ? error.name : 'error';
          });
      });
    });
    await app.evaluate(({ desktopCapturer }) => {
      const original = desktopCapturer.getSources.bind(desktopCapturer);
      let attempts = 0;
      desktopCapturer.getSources = async (options) => {
        attempts++;
        if (attempts === 1) throw new Error('Test permission failure');
        if (attempts === 2) return [];
        return original(options);
      };
    });
    const opening = app.waitForEvent('window');
    await page.click('#capture');
    const picker = await opening;
    await picker.waitForLoadState('domcontentloaded');
    await expect(picker.locator('#retry')).toBeVisible();
    await picker.locator('#retry').click();
    await expect(picker.locator('#sources')).toHaveAttribute('aria-busy', 'false', {
      timeout: 30000,
    });
    await expect(picker.locator('.source')).toHaveCount(0);
    await expect(picker.locator('#status')).not.toBeEmpty();
    await picker.locator('#retry').click();
    await expect(picker.locator('#sources')).toHaveAttribute('aria-busy', 'false', {
      timeout: 30000,
    });
    await expect(picker.locator('.source').first()).toBeVisible();
    expect(
      await picker.evaluate(() => ({ bridge: 'desktop' in window, require: 'require' in window })),
    ).toEqual({ bridge: false, require: false });
    await expect(picker.locator('#share')).toBeDisabled();
    await expect(picker.locator('#audio')).not.toBeChecked();
    await picker.screenshot({ path: test.info().outputPath('display-picker.png') });
    await picker.keyboard.press('Escape').catch((error) => {
      if (!picker.isClosed()) throw error;
    });
    await expect(page.locator('body')).toHaveAttribute('data-result', /AbortError|NotAllowedError/);

    const reopening = app.waitForEvent('window');
    await page.click('#capture');
    const second = await reopening;
    await expect(second.locator('.source').first()).toBeVisible({ timeout: 30000 });
    await second.setViewportSize({ width: 380, height: 540 });
    await second.locator('.source').first().focus();
    await second.keyboard.press('Enter');
    await expect(second.locator('#share')).toBeEnabled();
    if (process.platform === 'win32') await second.locator('#audio').check();
    await second.screenshot({ path: test.info().outputPath('display-picker-narrow.png') });
    await second.locator('#share').click();
    await expect(page.locator('body')).toHaveAttribute('data-result', 'captured');
    await expect(page.locator('body')).toHaveAttribute('data-video', '1');
    if (process.platform === 'win32')
      await expect(page.locator('body')).toHaveAttribute('data-audio', '1');
    const devices = await page.evaluate(async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const kinds = stream
        .getTracks()
        .map((track) => track.kind)
        .sort();
      stream.getTracks().forEach((track) => track.stop());
      return kinds;
    });
    expect(devices).toEqual(['audio', 'video']);
    const power = await app.evaluate(async ({ BrowserWindow, powerSaveBlocker }) => {
      const original = powerSaveBlocker.start.bind(powerSaveBlocker);
      let id: number | undefined;
      powerSaveBlocker.start = (type) => {
        id = original(type);
        return id;
      };
      const contents = BrowserWindow.getAllWindows()[0]?.webContents;
      const states: boolean[] = [];
      try {
        await contents?.executeJavaScript("window.desktop.setCallActive('call', true)");
        if (id === undefined) throw new Error('Call did not start blocker');
        states.push(powerSaveBlocker.isStarted(id));
        await contents?.executeJavaScript(
          "window.desktop.setCallActive('mesh', true); window.desktop.setCallActive('call', false)",
        );
        states.push(powerSaveBlocker.isStarted(id));
        await contents?.executeJavaScript("window.desktop.setCallActive('mesh', false)");
        states.push(powerSaveBlocker.isStarted(id));
        await contents?.executeJavaScript("window.desktop.setCallActive('call', true)");
        await BrowserWindow.getAllWindows()[0]?.loadURL('https://eternalnet.vercel.app/reloaded');
        states.push(powerSaveBlocker.isStarted(id));
        return states;
      } finally {
        powerSaveBlocker.start = original;
      }
    });
    expect(power).toEqual([true, true, false, false]);
    const native = await page.evaluate(async () => {
      await window.desktop?.setCallActive('call', true);
      const available = await window.desktop?.configurePushToTalk('call', true, 'KeyV');
      return available;
    });
    if (process.platform === 'win32') expect(native).toBe(true);
    const resetting = page.evaluate(() => window.desktop?.waitForCallAction('call'));
    await app.evaluate(({ powerMonitor }) => {
      powerMonitor.emit('suspend');
    });
    expect(await resetting).toBe('ptt-reset');
    await page.evaluate(async () => {
      await window.desktop?.configurePushToTalk('call', false, 'KeyV');
      await window.desktop?.setCallActive('call', false);
    });
  } finally {
    await app.close();
    await rm(userData, { recursive: true, force: true });
  }
});
