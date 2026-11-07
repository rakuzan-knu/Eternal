import { readFile, realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import {
  app,
  dialog,
  nativeImage,
  powerMonitor,
  shell,
  type BrowserWindow,
  type Session,
} from 'electron';
import { APP_ORIGIN, DEV_ORIGIN } from './constants';
import { createContentSecurityPolicy } from './csp';
import { registerIpc } from './ipc';
import { createProtocolHandler } from './protocol';
import { createAppSession } from './session';
import { createWindow } from './window';
import { configureDisplayMedia } from './displayMedia';
import { createCallPower } from './power';
import { createCallShortcuts } from './shortcuts';
import { createNavigationQueue, parseDeepLink } from './deepLinks';
import { createNativeNotifications } from './notifications';
import { createTray } from './tray';
import { configureMenu } from './menu';
import { createIdleMonitor } from './idle';
import { createYouTubeOAuth } from './youtubeOAuth';
import { oauthServiceOrigin } from './oauth';
import { createUpdater, type DesktopUpdater } from './updater';
import trayIconPath from '../assets/tray.png?asset';
import { loadPolicies } from './policies';
import { initializeLogging, diagnostic } from './logging';
import { initializeTelemetry, reportProcessFailure } from './telemetry';
import { setAutoLaunch } from './autoLaunch';

const development = !app.isPackaged && process.env.NODE_ENV === 'development';
const localRenderer =
  !app.isPackaged && !development && process.env.ETERNAL_DESKTOP_LOCAL_RENDERER === '1';
const origin = development ? DEV_ORIGIN : APP_ORIGIN;
let mainWindow: BrowserWindow | undefined;
let quitting = false;
let tray: Awaited<ReturnType<typeof createTray>> | undefined;
let idle: ReturnType<typeof createIdleMonitor> | undefined;
let updater: DesktopUpdater | undefined;
let minimumGate: Promise<void> | undefined;
const navigation = createNavigationQueue();
const youtube = createYouTubeOAuth(origin, oauthServiceOrigin('youtube', origin), (url) =>
  shell.openExternal(url),
);
function showWindow(): void {
  if (updater?.getState().required) {
    void enforceMinimum();
    return;
  }
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}
function enforceMinimum(): Promise<void> {
  if (minimumGate) return minimumGate;
  const run = async () => {
    while (updater?.getState().required && !quitting) {
      mainWindow?.hide();
      const state = updater.getState();
      const result = await dialog.showMessageBox({
        type: 'warning',
        title: 'Update Eternal',
        message: `Eternal ${state.minVersion} or newer is required`,
        detail:
          state.mode === 'managed'
            ? 'Update Eternal through your administrator or application store, then restart.'
            : 'Download and install the latest version to continue using Eternal.',
        buttons: ['Download update', 'Check again', 'Quit Eternal'],
        defaultId: 0,
        cancelId: 2,
        noLink: true,
      });
      if (result.response === 2) {
        app.quit();
        return;
      }
      if (result.response === 0) await updater.openDownload().catch(() => {});
      await updater.refreshMinimum();
    }
    if (!quitting) showWindow();
  };
  minimumGate = run().finally(() => {
    minimumGate = undefined;
  });
  return minimumGate;
}
function navigate(path: string): void {
  navigation.push(path);
  showWindow();
}
function receiveDeepLink(value: string): void {
  if (youtube.receive(value)) {
    showWindow();
    return;
  }
  const path = parseDeepLink(value);
  if (path) navigate(path);
}
const callPower = createCallPower();
const callShortcuts = createCallShortcuts(() => mainWindow?.isFocused() ?? true);
const resetCallResources = () => {
  callPower.reset();
  callShortcuts.reset();
};

if (app.isPackaged) {
  app.commandLine.removeSwitch('remote-debugging-port');
  app.commandLine.removeSwitch('remote-debugging-pipe');
}

function applyCsp(session: Session, csp: string): void {
  session.webRequest.onHeadersReceived((details, callback) => {
    if (
      details.resourceType === 'mainFrame' &&
      details.webContentsId === mainWindow?.webContents.id &&
      new URL(details.url).origin === origin
    ) {
      callback({
        responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] },
      });
    } else callback({});
  });
}

async function waitForRenderer(session: Session): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    const response = await session
      .fetch(DEV_ORIGIN, { signal: AbortSignal.timeout(1000) })
      .catch(() => null);
    if (response) {
      await response.body?.cancel();
      if (response.ok) return;
    }
    await setTimeout(500);
  }
  throw new Error('Web renderer unavailable at localhost:5173');
}

async function bootstrap(): Promise<void> {
  initializeLogging();
  diagnostic('startup');
  const policies = loadPolicies((count) => diagnostic('policy-unknown', count));
  initializeTelemetry();
  process.on('uncaughtExceptionMonitor', () => diagnostic('unhandled-error'));
  app.on('child-process-gone', () => {
    diagnostic('child-process-gone');
    reportProcessFailure();
  });
  await app.whenReady();
  if (policies.DisableAutoLaunch && app.isPackaged) await setAutoLaunch(false);
  app.setAppUserModelId('com.eternal.desktop');
  powerMonitor.on('suspend', callShortcuts.releasePushToTalk);
  powerMonitor.on('lock-screen', callShortcuts.releasePushToTalk);
  if (app.isPackaged) app.setAsDefaultProtocolClient('eternal');
  if (process.platform === 'linux')
    app.setDesktopName(process.env.FLATPAK_ID ? 'com.eternal.desktop.desktop' : 'eternal.desktop');
  updater = await createUpdater(() => {
    if (mainWindow) void enforceMinimum();
  }, callPower.isActive);
  configureMenu(showWindow, updater);
  await updater.refreshMinimum();
  await enforceMinimum();
  if (quitting) return;
  const icon = nativeImage.createFromPath(trayIconPath);
  const notifications = createNativeNotifications(() => mainWindow, navigate, icon);
  try {
    tray = await createTray(icon, showWindow);
  } catch {
    diagnostic('tray-unavailable');
  }
  idle = createIdleMonitor((state) => tray?.setIdle(state));
  app.on('will-quit', () => {
    navigation.reset();
    youtube.cancel();
    notifications.reset();
    idle?.dispose();
    tray?.destroy();
    updater?.dispose();
  });
  const session = await createAppSession(origin);
  if (development) {
    await waitForRenderer(session);
    applyCsp(session, createContentSecurityPolicy('', true));
  } else if (localRenderer) {
    const root = await realpath(resolve(app.getAppPath(), '../web/dist-desktop'));
    const html = await readFile(resolve(root, 'index.html'), 'utf8');
    session.protocol.handle(
      'https',
      createProtocolHandler(session, root, createContentSecurityPolicy(html)),
    );
  } else {
    const response = await session.fetch(`${APP_ORIGIN}/`, {
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Hosted renderer unavailable');
    applyCsp(session, createContentSecurityPolicy(await response.text()));
  }
  registerIpc(
    () => mainWindow?.webContents,
    origin,
    callPower,
    callShortcuts,
    notifications,
    navigation,
    idle,
    updater,
    youtube,
  );
  configureDisplayMedia(session, () => mainWindow?.webContents, origin);
  const openWindow = async () => {
    await enforceMinimum();
    if (quitting || mainWindow) return;
    mainWindow = createWindow(session, origin, () => !quitting && !updater?.getState().required);
    mainWindow.on('close', (event) => {
      if (!quitting && tray) {
        event.preventDefault();
        mainWindow?.hide();
      }
    });
    mainWindow.on('focus', callShortcuts.releasePushToTalk);
    mainWindow.webContents.on('did-start-navigation', (_event, _url, inPlace, mainFrame) => {
      if (mainFrame && !inPlace) {
        youtube.cancel();
        resetCallResources();
        notifications.reset();
        navigation.cancel();
      }
    });
    mainWindow.webContents.on('render-process-gone', () => {
      diagnostic('renderer-gone');
      reportProcessFailure();
      youtube.cancel();
      resetCallResources();
      notifications.reset();
      navigation.reset();
    });
    mainWindow.on('closed', () => {
      youtube.cancel();
      resetCallResources();
      mainWindow = undefined;
    });
    await mainWindow.loadURL(`${origin}/`);
  };
  await openWindow();
  diagnostic('ready');
  updater.start();
  void updater.check();
  app.on('activate', () => {
    if (!mainWindow) void openWindow().catch(failStartup);
    else showWindow();
  });
}

function failStartup(): void {
  if (quitting) return;
  diagnostic('startup-failed');
  dialog.showErrorBox(
    'Eternal',
    'Unable to start Eternal. Check your network connection and administrator policies. Diagnostic logs are available in the application logs directory.',
  );
  app.quit();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('before-quit', () => {
    diagnostic('shutdown');
    quitting = true;
  });
  app.on('open-url', (event, url) => {
    event.preventDefault();
    receiveDeepLink(url);
  });
  for (const value of process.argv) {
    if (/^eternal:\/\//i.test(value)) receiveDeepLink(value);
  }
  app.on('second-instance', (_event, argv) => {
    for (const value of argv) {
      if (/^eternal:\/\//i.test(value)) receiveDeepLink(value);
    }
    showWindow();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('will-quit', resetCallResources);
  void bootstrap().catch(failStartup);
}
