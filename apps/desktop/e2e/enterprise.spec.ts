import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

const powershell = join(
  process.env.SystemRoot ?? 'C:\\Windows',
  'System32/WindowsPowerShell/v1.0/powershell.exe',
);
const run = (script: string) =>
  execFileSync(
    powershell,
    ['-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference = 'Stop'; ${script}`],
    { encoding: 'utf8', windowsHide: true, timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] },
  );

test('Windows registry policies apply before hosted renderer and log export', async () => {
  test.skip(process.platform !== 'win32', 'Windows registry acceptance');
  const existing = run("Test-Path 'HKCU:\\Software\\Policies\\Eternal'").trim();
  test.skip(existing === 'True', 'Preserve existing administrator/user policy');
  try {
    run(`$key = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Software\\Policies\\Eternal'); try {
      foreach ($name in @('DisableTelemetry','DisableAutoUpdate','DisableAutoLaunch')) { $key.SetValue($name, 1, [Microsoft.Win32.RegistryValueKind]::DWord) }
      $key.SetValue('EnableDevTools', 0, [Microsoft.Win32.RegistryValueKind]::DWord)
      $key.SetValue('UpdateChannel', 'stable', [Microsoft.Win32.RegistryValueKind]::String)
      $key.SetValue('Phase7Unknown', 'private-test-value', [Microsoft.Win32.RegistryValueKind]::String)
    } finally { $key.Dispose() }`);
  } catch (error) {
    test.skip(
      error instanceof Error && error.message.includes('UnauthorizedAccessException'),
      'Host denies writes to HKCU policy keys',
    );
    throw error;
  }
  const profile = await mkdtemp(join(tmpdir(), 'eternal-enterprise-'));
  const destination = join(profile, 'diagnostics.txt');
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  let client: Awaited<ReturnType<typeof electron.launch>> | undefined;
  try {
    client = await electron.launch({
      args: ['.', `--user-data-dir=${profile}`],
      cwd: process.cwd(),
      env: { ...environment, NODE_ENV: 'production', ETERNAL_DESKTOP_LOCAL_RENDERER: '0' },
    });
    const page = await client.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    expect(await page.evaluate(() => window.desktop?.telemetryDisabled)).toBe(true);
    expect(await page.evaluate(() => window.desktop?.getUpdateState?.())).toMatchObject({
      mode: 'managed',
      channel: 'stable',
    });
    await expect(page.evaluate(() => window.desktop?.setUpdateChannel?.('beta'))).rejects.toThrow(
      'administrator',
    );
    const settings = await client.evaluate(async ({ BrowserWindow, Menu }) => {
      const contents = BrowserWindow.getAllWindows()[0]?.webContents;
      contents?.openDevTools();
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        devTools: contents?.isDevToolsOpened(),
        channelEnabled: Menu.getApplicationMenu()
          ?.items.find((item) => item.role === 'help')
          ?.submenu?.items.find((item) => item.label === 'Update channel')?.enabled,
      };
    });
    expect(settings).toEqual({ devTools: false, channelEnabled: false });
    const blocked = await client.evaluate(async ({ session }) => {
      try {
        await session
          .fromPartition('persist:eternal')
          .fetch('https://telemetry.invalid/api/1/envelope/');
        return false;
      } catch (error) {
        return error instanceof Error && error.message.includes('ERR_BLOCKED_BY_CLIENT');
      }
    });
    expect(blocked).toBe(true);
    await client.evaluate(({ dialog, Menu }, path) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
      const item = Menu.getApplicationMenu()
        ?.items.find((entry) => entry.role === 'help')
        ?.submenu?.items.find((entry) => entry.label === 'Export logs…');
      if (!item) throw new Error('Export action missing');
      item.click();
    }, destination);
    await expect
      .poll(async () => readFile(destination, 'utf8').catch(() => ''))
      .toContain('policy-unknown 1');
    expect(await readFile(destination, 'utf8')).not.toContain('private-test-value');
  } finally {
    await client?.close();
    run(`$key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Software\\Policies\\Eternal', $true); if ($null -ne $key) { try {
      foreach ($name in @('DisableTelemetry','DisableAutoUpdate','DisableAutoLaunch','EnableDevTools','UpdateChannel','Phase7Unknown')) { $key.DeleteValue($name, $false) }
      $empty = $key.ValueCount -eq 0 -and $key.SubKeyCount -eq 0
    } finally { $key.Dispose() }; if ($empty) { [Microsoft.Win32.Registry]::CurrentUser.DeleteSubKey('Software\\Policies\\Eternal', $false) } }`);
    await rm(profile, { recursive: true, force: true });
  }
});

test('native Help exports bounded local diagnostics without registry writes', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'eternal-export-'));
  const destination = join(profile, 'diagnostics.txt');
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] =>
        entry[1] !== undefined && entry[0] !== 'ELECTRON_RUN_AS_NODE',
    ),
  );
  const client = await electron.launch({
    args: ['.', `--user-data-dir=${profile}`],
    cwd: process.cwd(),
    env: { ...environment, NODE_ENV: 'production', ETERNAL_DESKTOP_LOCAL_RENDERER: '0' },
  });
  try {
    const page = await client.firstWindow();
    await page.waitForLoadState('load');
    const logs = await client.evaluate(({ app }) => app.getPath('logs'));
    await expect
      .poll(async () => readFile(join(logs, 'main.log'), 'utf8').catch(() => ''))
      .toContain('ready');
    await client.evaluate(({ dialog, Menu }, path) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
      const item = Menu.getApplicationMenu()
        ?.items.find((entry) => entry.role === 'help')
        ?.submenu?.items.find((entry) => entry.label === 'Export logs…');
      if (!item) throw new Error('Export action missing');
      item.click();
    }, destination);
    await expect.poll(async () => readFile(destination, 'utf8').catch(() => '')).toContain('ready');
    expect((await readFile(destination, 'utf8')).length).toBeLessThan(4 * 1024 * 1024 + 200);
  } finally {
    await client.close();
    await rm(profile, { recursive: true, force: true });
  }
});
