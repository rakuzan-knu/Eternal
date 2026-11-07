import { test, expect } from '@playwright/test';
import type { UpdateState } from '../../desktop/src/shared/updates';

declare global {
  interface Window {
    desktopUpdateFixture: {
      state: UpdateState;
      downloads: number;
      installs: number;
      manual: number;
      failInstall: boolean;
      complete: (() => void) | null;
    };
  }
}
const initial: UpdateState = {
  currentVersion: '1.0.0',
  channel: 'stable',
  mode: 'automatic',
  status: 'available',
  latestVersion: '1.1.0',
  minVersion: '1.0.0',
  required: false,
  progress: null,
  error: null,
  minimumCheckFailed: false,
};
test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.addInitScript((state: UpdateState) => {
    const fixture: Window['desktopUpdateFixture'] = {
      state,
      downloads: 0,
      installs: 0,
      manual: 0,
      failInstall: false,
      complete: null,
    };
    window.desktopUpdateFixture = fixture;
    Object.defineProperty(window, 'desktop', {
      value: {
        getUpdateState: async () => ({ ...fixture.state }),
        checkForUpdates: async () => ({ ...fixture.state }),
        downloadUpdate: async () => {
          fixture.downloads++;
          fixture.state.status = 'downloading';
          fixture.state.progress = 37;
          return new Promise<UpdateState>((resolve) => {
            fixture.complete = () => {
              fixture.state.status = 'downloaded';
              fixture.state.progress = 100;
              resolve({ ...fixture.state });
            };
          });
        },
        installUpdate: async () => {
          fixture.installs++;
          if (fixture.failInstall) throw new Error('Call active');
        },
        openUpdateDownload: async () => {
          fixture.manual++;
        },
      },
    });
  }, initial);
});

test('shows download progress, supports keyboard restart and preserves a failed installation', async ({
  page,
}) => {
  await page.goto('/e2e/fixtures/desktop-updates.html');
  await expect(page.getByRole('status')).toContainText('1.1.0');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Download update' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.clock.runFor(10100);
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '37');
  expect(await page.evaluate(() => window.desktopUpdateFixture.downloads)).toBe(1);
  await page.screenshot({ path: test.info().outputPath('desktop-updates-progress.png') });
  await page.evaluate(() => {
    window.desktopUpdateFixture.complete?.();
    window.desktopUpdateFixture.failInstall = true;
  });
  const install = page.getByRole('button', { name: 'Restart and install' });
  await expect(install).toBeEnabled();
  await install.click();
  await expect(page.getByRole('alert')).toContainText('finish any active call');
  await expect(install).toBeEnabled();
});

test('keeps manual and required updates usable at narrow width with Ukrainian copy', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem(
      'eternal_language_preference',
      JSON.stringify({ state: { currentLanguage: 'Українська' }, version: 0 }),
    );
  });
  await page.goto('/e2e/fixtures/desktop-updates.html');
  await page.evaluate(() => {
    const state = window.desktopUpdateFixture.state;
    state.mode = 'manual';
    state.required = true;
    document.documentElement.style.setProperty('--app-bg-color', '#ffffff');
    document.documentElement.style.setProperty('--app-text-primary', '#111111');
  });
  await page.clock.runFor(10100);
  await expect(page.getByRole('status')).toContainText('Потрібне оновлення');
  await expect(page.getByRole('button', { name: 'Пізніше' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Відкрити сторінку завантаження' }).click();
  expect(await page.evaluate(() => window.desktopUpdateFixture.manual)).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: test.info().outputPath('desktop-updates-uk-narrow.png') });
});
