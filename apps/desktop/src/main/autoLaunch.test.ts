import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const app = vi.hoisted(() => ({
  disabled: false,
  isPackaged: true,
  getLoginItemSettings: vi.fn(),
  setLoginItemSettings: vi.fn(),
}));
vi.mock('electron', () => ({ app }));
vi.mock('./policies', () => ({ getPolicies: () => ({ DisableAutoLaunch: app.disabled }) }));
import { createAutostartEntry, getAutoLaunch, setAutoLaunch } from './autoLaunch';

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  app.isPackaged = true;
  app.disabled = false;
});

describe('opt-in autostart', () => {
  it.each(['FLATPAK_ID', 'SNAP'])(
    'does not create ineffective host autostart under %s',
    async (key) => {
      vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
      vi.stubEnv(key, 'eternal');
      expect(await getAutoLaunch()).toBe(false);
      await expect(setAutoLaunch(true)).rejects.toThrow('store package');
      await expect(setAutoLaunch(false)).resolves.toBeUndefined();
      expect(app.setLoginItemSettings).not.toHaveBeenCalled();
    },
  );
  it('blocks opt-in under policy and permits removal of an existing login item', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    app.disabled = true;
    app.getLoginItemSettings.mockReturnValue({ openAtLogin: false });
    await expect(setAutoLaunch(true)).rejects.toThrow('administrator');
    await setAutoLaunch(false);
    expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: false });
  });
  it('does not configure a development Electron binary', async () => {
    app.isPackaged = false;
    expect(await getAutoLaunch()).toBe(false);
    await expect(setAutoLaunch(true)).rejects.toThrow('installed');
    expect(app.setLoginItemSettings).not.toHaveBeenCalled();
  });

  it('writes and removes a user-scoped Linux entry only on explicit changes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'eternal-autostart-'));
    vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
    vi.stubEnv('XDG_CONFIG_HOME', directory);
    vi.stubEnv('APPIMAGE', join(directory, 'Eternal 100%.AppImage'));
    try {
      expect(await getAutoLaunch()).toBe(false);
      await setAutoLaunch(true);
      expect(await getAutoLaunch()).toBe(true);
      const entry = await readFile(
        join(directory, 'autostart', 'com.eternal.desktop.desktop'),
        'utf8',
      );
      expect(entry).toContain('100%%.AppImage"');
      await setAutoLaunch(false);
      expect(await getAutoLaunch()).toBe(false);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects desktop-file line injection and quotes executable arguments', () => {
    expect(() => createAutostartEntry('/opt/Eternal\nHidden=true')).toThrow();
    expect(() => createAutostartEntry('relative')).toThrow();
    expect(() => createAutostartEntry('/opt/Eternal=other')).toThrow();
    expect(createAutostartEntry(join(tmpdir(), 'Eternal "$`%.AppImage'))).toContain(
      'Eternal \\\\"\\\\$\\\\`%%.AppImage',
    );
  });

  it('uses OS login items and reports a failed update', async () => {
    vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
    app.getLoginItemSettings.mockReturnValue({ openAtLogin: false });
    await expect(setAutoLaunch(true)).rejects.toThrow('not applied');
    expect(app.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true });
  });
});
