import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app, net, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import { z } from 'zod';
import { updateMode } from '../shared/distribution';
import {
  compareVersions,
  minimumVersionSchema,
  updateChannelSchema,
  versionSchema,
  type UpdateChannel,
  type UpdateState,
} from '../shared/updates';
import { APP_ORIGIN } from './constants';
import { getPolicies } from './policies';
import { diagnostic } from './logging';

const releases = 'https://github.com/rakuzan-knu/Eternal/releases';
const preferencesSchema = z.object({
  channel: updateChannelSchema,
  minVersion: versionSchema.nullable().default(null),
});

export async function createUpdater(onRequired: () => void, isCallActive: () => boolean) {
  const policies = getPolicies();
  const file = join(app.getPath('userData'), 'updates.json');
  const metadata: unknown = JSON.parse(
    await readFile(join(app.getAppPath(), 'package.json'), 'utf8'),
  );
  const distribution = z
    .object({ eternalDistribution: z.string().optional() })
    .parse(metadata).eternalDistribution;
  let preferences = preferencesSchema.parse({
    channel: app.getVersion().includes('-beta') ? 'beta' : 'stable',
  });
  try {
    preferences = preferencesSchema.parse(JSON.parse(await readFile(file, 'utf8')));
  } catch {
    preferences = { ...preferences };
  }
  const state: UpdateState = {
    currentVersion: versionSchema.parse(app.getVersion()),
    channel: policies.UpdateChannel ?? preferences.channel,
    mode: policies.DisableAutoUpdate
      ? 'managed'
      : updateMode(
          app.isPackaged,
          process.platform,
          distribution,
          Boolean(process.env.APPIMAGE),
          Boolean(
            process.windowsStore || process.mas || process.env.SNAP || process.env.FLATPAK_ID,
          ),
        ),
    status: 'idle',
    latestVersion: null,
    minVersion: preferences.minVersion,
    required: false,
    progress: null,
    error: null,
    minimumCheckFailed: false,
  };
  let checking: Promise<UpdateState> | undefined;
  let downloading: Promise<UpdateState> | undefined;
  let disposed = false;
  let changingChannel = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const getState = (): UpdateState => ({ ...state });
  const enforce = () => {
    state.required = Boolean(
      app.isPackaged &&
      state.minVersion &&
      compareVersions(state.currentVersion, state.minVersion) < 0,
    );
    if (state.required && !disposed) onRequired();
  };
  let writing = Promise.resolve();
  const persist = () => {
    const contents = JSON.stringify({ channel: state.channel, minVersion: state.minVersion });
    const task = writing
      .catch(() => {})
      .then(async () => {
        await mkdir(app.getPath('userData'), { recursive: true });
        await writeFile(`${file}.tmp`, contents, { mode: 0o600 });
        await rename(`${file}.tmp`, file);
      });
    writing = task;
    return task;
  };
  enforce();
  const engine = state.mode === 'automatic' || state.mode === 'manual' ? autoUpdater : undefined;
  const configure = () => {
    if (!engine) return;
    engine.autoDownload = false;
    engine.autoInstallOnAppQuit = false;
    engine.allowPrerelease = state.channel === 'beta';
    engine.channel = state.channel === 'stable' ? 'latest' : 'beta';
    engine.allowDowngrade = false;
    engine.setFeedURL({
      provider: 'github',
      owner: 'rakuzan-knu',
      repo: 'Eternal',
      private: false,
    });
    engine.logger = null;
  };
  configure();
  const progress = (value: { percent: number }) => {
    if (disposed || state.status !== 'downloading') return;
    state.progress = Math.max(0, Math.min(100, Number.isFinite(value.percent) ? value.percent : 0));
  };
  const engineError = () => {
    if (!checking && !downloading && !disposed) {
      state.status = 'error';
      state.error = 'check';
    }
  };
  engine?.on('download-progress', progress);
  engine?.on('error', engineError);
  const checkMinimum = async () => {
    if (!app.isPackaged) return;
    try {
      const response = await net.fetch(`${APP_ORIGIN}/desktop/version.json`, {
        cache: 'no-store',
        credentials: 'omit',
        signal: AbortSignal.timeout(10000),
        bypassCustomProtocolHandlers: true,
      });
      if (!response.ok || Number(response.headers.get('content-length')) > 4096)
        throw new Error('Invalid version policy');
      const body = await response.text();
      if (body.length > 4096) throw new Error('Invalid version policy');
      const policy = minimumVersionSchema.parse(JSON.parse(body));
      state.minVersion = policy.minVersion;
      state.minimumCheckFailed = false;
      await persist();
    } catch {
      diagnostic('minimum-check-failed');
      state.minimumCheckFailed = true;
    }
    enforce();
  };
  const check = (): Promise<UpdateState> => {
    if (checking) return checking;
    if (changingChannel) return Promise.resolve(getState());
    if (disposed) return Promise.resolve(getState());
    const run = async () => {
      const busy = Boolean(downloading || state.status === 'downloaded');
      if (!busy) state.status = 'checking';
      state.error = null;
      await checkMinimum();
      if (busy) return getState();
      if (engine) {
        try {
          const result = await engine.checkForUpdates();
          const version = versionSchema.parse(result?.updateInfo.version);
          const eligible = state.channel === 'beta' || !version.split('+')[0].includes('-');
          state.latestVersion =
            result?.isUpdateAvailable &&
            eligible &&
            compareVersions(version, state.currentVersion) > 0
              ? version
              : null;
          state.status = state.latestVersion ? 'available' : 'idle';
        } catch {
          diagnostic('update-check-failed');
          state.status = 'error';
          state.error = 'check';
        }
      } else state.status = 'idle';
      return getState();
    };
    checking = run().finally(() => {
      checking = undefined;
    });
    return checking;
  };
  return {
    getState,
    check,
    refreshMinimum: checkMinimum,
    async setChannel(channel: UpdateChannel) {
      if (policies.UpdateChannel || policies.DisableAutoUpdate)
        throw new Error('Update channel is managed by your administrator');
      if (changingChannel || checking || downloading || state.status === 'downloaded')
        throw new Error('Update is busy');
      const previous = getState();
      state.channel = updateChannelSchema.parse(channel);
      changingChannel = true;
      state.latestVersion = null;
      state.status = 'checking';
      try {
        await persist();
      } catch {
        Object.assign(state, previous);
        state.error = 'preferences';
        changingChannel = false;
        throw new Error('Unable to save update channel');
      }
      changingChannel = false;
      state.status = 'idle';
      configure();
      return check();
    },
    download(): Promise<UpdateState> {
      if (downloading) return downloading;
      if (
        changingChannel ||
        !engine ||
        state.mode !== 'automatic' ||
        !state.latestVersion ||
        state.status !== 'available'
      )
        return Promise.reject(new Error('Update download unavailable'));
      state.status = 'downloading';
      state.progress = 0;
      state.error = null;
      downloading = engine
        .downloadUpdate()
        .then(() => {
          state.status = 'downloaded';
          state.progress = 100;
          return getState();
        })
        .catch(() => {
          diagnostic('update-download-failed');
          state.status = 'error';
          state.error = 'download';
          state.progress = null;
          return getState();
        })
        .finally(() => {
          downloading = undefined;
        });
      return downloading;
    },
    install() {
      if (!engine || state.mode !== 'automatic' || state.status !== 'downloaded')
        throw new Error('Update is not ready');
      if (isCallActive()) throw new Error('End your call before installing the update');
      engine.quitAndInstall(false, true);
    },
    async openDownload() {
      await shell.openExternal(
        state.mode === 'managed'
          ? releases
          : state.channel === 'beta'
            ? releases
            : `${releases}/latest`,
      );
    },
    start() {
      if (timer || !app.isPackaged) return;
      timer = setInterval(
        () => {
          void check();
        },
        6 * 60 * 60 * 1000,
      );
      timer.unref();
    },
    dispose() {
      disposed = true;
      if (timer) clearInterval(timer);
      engine?.removeListener('download-progress', progress);
      engine?.removeListener('error', engineError);
    },
  };
}
export type DesktopUpdater = Awaited<ReturnType<typeof createUpdater>>;
