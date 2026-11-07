import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  policies: {} as { DisableAutoUpdate?: boolean; UpdateChannel?: 'stable' | 'beta' },
  root: '',
  packaged: true,
  callActive: false,
  fetch: vi.fn(),
  openExternal: vi.fn(),
  required: vi.fn(),
  engine: {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowPrerelease: false,
    allowDowngrade: false,
    channel: '',
    logger: null,
    setFeedURL: vi.fn(),
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}));
vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return mocks.packaged;
    },
    getPath: () => mocks.root,
    getAppPath: () => mocks.root,
    getVersion: () => '1.0.0',
  },
  net: { fetch: mocks.fetch },
  shell: { openExternal: mocks.openExternal },
}));
vi.mock('electron-updater', () => ({ autoUpdater: mocks.engine }));
vi.mock('./policies', () => ({ getPolicies: () => mocks.policies }));
vi.mock('./logging', () => ({ diagnostic: vi.fn() }));
import { createUpdater, type DesktopUpdater } from './updater';

let updater: DesktopUpdater | undefined;
beforeEach(async () => {
  vi.clearAllMocks();
  mocks.policies = {};
  mocks.packaged = true;
  mocks.callActive = false;
  mocks.root = await mkdtemp(join(tmpdir(), 'eternal-updates-'));
  await writeFile(
    join(mocks.root, 'package.json'),
    JSON.stringify({ eternalDistribution: process.platform === 'linux' ? 'AppImage' : 'nsis' }),
  );
  vi.stubEnv('APPIMAGE', '/tmp/Eternal.AppImage');
  mocks.fetch.mockImplementation(async () => new Response('{"minVersion":"0.0.0"}'));
  mocks.engine.checkForUpdates.mockResolvedValue({
    isUpdateAvailable: true,
    updateInfo: { version: '1.1.0' },
  });
  mocks.engine.downloadUpdate.mockResolvedValue(['Eternal']);
});
afterEach(async () => {
  updater?.dispose();
  updater = undefined;
  vi.unstubAllEnvs();
  await rm(mocks.root, { recursive: true, force: true });
});
const create = async () => {
  updater = await createUpdater(mocks.required, () => mocks.callActive);
  return updater;
};

describe('desktop update lifecycle', () => {
  it('enforces managed updates without disabling the minimum version gate', async () => {
    mocks.policies = { DisableAutoUpdate: true };
    mocks.fetch.mockResolvedValue(new Response('{"minVersion":"2.0.0"}'));
    const service = await create();
    await service.check();
    expect(service.getState()).toMatchObject({ mode: 'managed', required: true });
    expect(mocks.engine.setFeedURL).not.toHaveBeenCalled();
    expect(mocks.engine.checkForUpdates).not.toHaveBeenCalled();
    await expect(service.download()).rejects.toThrow('unavailable');
    await expect(service.setChannel('beta')).rejects.toThrow('administrator');
  });
  it('overrides saved channel and refuses IPC or menu attempts to change managed channel', async () => {
    await writeFile(join(mocks.root, 'updates.json'), '{"channel":"beta"}');
    mocks.policies = { UpdateChannel: 'stable' };
    const service = await create();
    expect(service.getState().channel).toBe('stable');
    expect(mocks.engine.allowPrerelease).toBe(false);
    await expect(service.setChannel('beta')).rejects.toThrow('administrator');
    expect(service.getState().channel).toBe('stable');
  });
  it('checks the uncached HTTPS policy and retains it across offline restarts', async () => {
    mocks.fetch.mockResolvedValueOnce(new Response('{"minVersion":"1.0.1"}'));
    const service = await create();
    await service.refreshMinimum();
    expect(service.getState()).toMatchObject({ required: true, minVersion: '1.0.1' });
    expect(mocks.required).toHaveBeenCalled();
    expect(mocks.fetch).toHaveBeenCalledWith(
      'https://eternalnet.vercel.app/desktop/version.json',
      expect.objectContaining({
        cache: 'no-store',
        credentials: 'omit',
        bypassCustomProtocolHandlers: true,
      }),
    );
    service.dispose();
    mocks.fetch.mockRejectedValue(new Error('offline with private URL'));
    const restarted = await create();
    await restarted.refreshMinimum();
    expect(restarted.getState()).toMatchObject({
      required: true,
      minVersion: '1.0.1',
      minimumCheckFailed: true,
    });
  });
  it.each([
    '<html>SPA fallback</html>',
    '{"minVersion":"999"}',
    '{"minVersion":7}',
    'x'.repeat(4097),
  ])('does not force an update from malformed policy %#', async (body) => {
    mocks.fetch.mockResolvedValue(new Response(body));
    const service = await create();
    await service.refreshMinimum();
    expect(service.getState()).toMatchObject({
      required: false,
      minVersion: null,
      minimumCheckFailed: true,
    });
  });
  it('does not use update feeds or the policy network in development', async () => {
    mocks.packaged = false;
    const service = await create();
    await service.check();
    expect(service.getState().mode).toBe('disabled');
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.engine.checkForUpdates).not.toHaveBeenCalled();
    await expect(service.download()).rejects.toThrow('unavailable');
  });
  it('keeps MSI updates managed and never invokes the updater engine', async () => {
    await writeFile(join(mocks.root, 'package.json'), '{"eternalDistribution":"msi"}');
    const service = await create();
    await service.check();
    expect(service.getState().mode).toBe('managed');
    expect(mocks.engine.checkForUpdates).not.toHaveBeenCalled();
    await expect(service.download()).rejects.toThrow('unavailable');
    expect(() => service.install()).toThrow('not ready');
  });
  it('stores beta preference without enabling downgrades or automatic installation', async () => {
    const service = await create();
    await service.setChannel('beta');
    expect(JSON.parse(await readFile(join(mocks.root, 'updates.json'), 'utf8'))).toMatchObject({
      channel: 'beta',
    });
    expect(mocks.engine).toMatchObject({
      channel: 'beta',
      allowPrerelease: true,
      allowDowngrade: false,
      autoDownload: false,
      autoInstallOnAppQuit: false,
    });
    service.dispose();
    expect((await create()).getState().channel).toBe('beta');
  });
  it('deduplicates checks, forbids channel changes while checking and filters stable prereleases', async () => {
    let finish: (value: {
      isUpdateAvailable: boolean;
      updateInfo: { version: string };
    }) => void = () => {};
    mocks.engine.checkForUpdates.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const service = await create();
    const first = service.check();
    expect(service.check()).toBe(first);
    await expect(service.setChannel('beta')).rejects.toThrow('busy');
    await vi.waitFor(() => expect(mocks.engine.checkForUpdates).toHaveBeenCalled());
    finish({ isUpdateAvailable: true, updateInfo: { version: '1.1.0-beta.1' } });
    expect(await first).toMatchObject({ status: 'idle', latestVersion: null });
  });
  it('honors updater eligibility checks such as staged rollout and minimum OS version', async () => {
    mocks.engine.checkForUpdates.mockResolvedValue({
      isUpdateAvailable: false,
      updateInfo: { version: '1.1.0' },
    });
    const service = await create();
    expect(await service.check()).toMatchObject({ status: 'idle', latestVersion: null });
    await expect(service.download()).rejects.toThrow('unavailable');
  });
  it.skipIf(process.platform === 'darwin')(
    'locks channel changes before persistence and rejects competing operations',
    async () => {
      const service = await create();
      await service.check();
      const transition = service.setChannel('beta');
      await expect(service.setChannel('stable')).rejects.toThrow('busy');
      await expect(service.download()).rejects.toThrow('unavailable');
      expect(await service.check()).toMatchObject({ status: 'checking', latestVersion: null });
      expect(mocks.engine.checkForUpdates).toHaveBeenCalledTimes(1);
      await transition;
      expect(service.getState()).toMatchObject({ channel: 'beta', status: 'available' });
    },
  );
  it.skipIf(process.platform === 'darwin')(
    'requires an explicit verified download, forbids restart during calls and keeps checking minimum after download',
    async () => {
      const service = await create();
      expect(() => service.install()).toThrow('not ready');
      await service.check();
      expect(mocks.engine.downloadUpdate).not.toHaveBeenCalled();
      expect(await service.download()).toMatchObject({ status: 'downloaded', progress: 100 });
      mocks.callActive = true;
      expect(() => service.install()).toThrow('End your call');
      mocks.callActive = false;
      service.install();
      expect(mocks.engine.quitAndInstall).toHaveBeenCalledExactlyOnceWith(false, true);
      mocks.fetch.mockResolvedValueOnce(new Response('{"minVersion":"1.0.2"}'));
      await service.check();
      expect(service.getState()).toMatchObject({ status: 'downloaded', required: true });
      expect(mocks.engine.checkForUpdates).toHaveBeenCalledTimes(1);
    },
  );
  it('uses a fixed release destination and sanitizes feed errors', async () => {
    mocks.engine.checkForUpdates.mockRejectedValue(new Error('https://user:secret@private.test'));
    const service = await create();
    const state = await service.check();
    expect(state).toMatchObject({ status: 'error', error: 'check' });
    expect(JSON.stringify(state)).not.toContain('secret');
    await service.openDownload();
    expect(mocks.openExternal).toHaveBeenCalledWith(
      'https://github.com/rakuzan-knu/Eternal/releases/latest',
    );
  });
});
