import { app, ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron';
import {
  desktopChannels,
  callActiveArgumentsSchema,
  callActionArgumentsSchema,
  pushToTalkArgumentsSchema,
  desktopInfoSchema,
  externalArgumentsSchema,
  noArgumentsSchema,
  notificationArgumentsSchema,
  badgeArgumentsSchema,
} from '../shared/ipcContract';
import { isTrustedUrl, openExternal } from './security';
import { resetOAuthPopups } from './oauth';
import type { createCallPower } from './power';
import type { createCallShortcuts } from './shortcuts';
import type { createNativeNotifications } from './notifications';
import type { createNavigationQueue } from './deepLinks';
import type { createIdleMonitor } from './idle';
import type { DesktopUpdater } from './updater';
import { updateChannelArgumentsSchema, updateStateSchema } from '../shared/updates';
import {
  youtubeConnectArgumentsSchema,
  youtubeCancelArgumentsSchema,
} from '../shared/youtubeOAuth';
import type { createYouTubeOAuth } from './youtubeOAuth';

export function isAuthorizedSender(
  event: IpcMainInvokeEvent,
  contents: WebContents,
  origin: string,
): boolean {
  const frame = event.senderFrame;
  return (
    event.sender === contents &&
    !contents.isDestroyed() &&
    frame !== null &&
    frame === contents.mainFrame &&
    isTrustedUrl(frame.url, origin)
  );
}

export function registerIpc(
  getContents: () => WebContents | undefined,
  origin: string,
  power: ReturnType<typeof createCallPower>,
  shortcuts: ReturnType<typeof createCallShortcuts>,
  notifications: ReturnType<typeof createNativeNotifications>,
  navigation: ReturnType<typeof createNavigationQueue>,
  idle: ReturnType<typeof createIdleMonitor>,
  updater: DesktopUpdater,
  youtube: ReturnType<typeof createYouTubeOAuth>,
): void {
  const authorize = (event: IpcMainInvokeEvent) => {
    const contents = getContents();
    if (!contents || !isAuthorizedSender(event, contents, origin)) {
      throw new Error('Unauthorized desktop IPC sender');
    }
  };
  ipcMain.handle(desktopChannels.getInfo, (event, ...args: unknown[]) => {
    authorize(event);
    noArgumentsSchema.parse(args);
    return desktopInfoSchema.parse({ version: app.getVersion(), platform: process.platform });
  });
  for (const [channel, action] of [
    [desktopChannels.getUpdateState, () => updater.getState()],
    [desktopChannels.checkForUpdates, () => updater.check()],
    [desktopChannels.downloadUpdate, () => updater.download()],
  ] as const) {
    ipcMain.handle(channel, async (event, ...args: unknown[]) => {
      authorize(event);
      noArgumentsSchema.parse(args);
      const result = await action();
      authorize(event);
      return updateStateSchema.parse(result);
    });
  }
  ipcMain.handle(desktopChannels.setUpdateChannel, async (event, ...args: unknown[]) => {
    authorize(event);
    const [channel] = updateChannelArgumentsSchema.parse(args);
    const result = await updater.setChannel(channel);
    authorize(event);
    return updateStateSchema.parse(result);
  });
  ipcMain.handle(desktopChannels.installUpdate, (event, ...args: unknown[]) => {
    authorize(event);
    noArgumentsSchema.parse(args);
    updater.install();
  });
  ipcMain.handle(desktopChannels.openUpdateDownload, async (event, ...args: unknown[]) => {
    authorize(event);
    noArgumentsSchema.parse(args);
    await updater.openDownload();
  });
  ipcMain.handle(desktopChannels.openExternal, async (event, ...args: unknown[]) => {
    authorize(event);
    const [url] = externalArgumentsSchema.parse(args);
    await openExternal(url);
  });
  ipcMain.handle(desktopChannels.connectYouTube, async (event, ...args: unknown[]) => {
    authorize(event);
    const [url, transaction] = youtubeConnectArgumentsSchema.parse(args);
    const result = await youtube.connect(url, transaction);
    authorize(event);
    return result;
  });
  ipcMain.handle(desktopChannels.cancelYouTube, (event, ...args: unknown[]) => {
    authorize(event);
    const [transaction] = youtubeCancelArgumentsSchema.parse(args);
    youtube.cancel(transaction);
  });
  ipcMain.handle(desktopChannels.setCallActive, (event, ...args: unknown[]) => {
    authorize(event);
    const [scope, active] = callActiveArgumentsSchema.parse(args);
    power.setActive(scope, active);
    shortcuts.setActive(scope, active);
  });
  ipcMain.handle(desktopChannels.waitForCallAction, async (event, ...args: unknown[]) => {
    authorize(event);
    const [scope] = callActionArgumentsSchema.parse(args);
    const action = await shortcuts.wait(scope);
    authorize(event);
    return action;
  });
  ipcMain.handle(desktopChannels.configurePushToTalk, async (event, ...args: unknown[]) => {
    authorize(event);
    const [scope, enabled, key] = pushToTalkArgumentsSchema.parse(args);
    return shortcuts.configurePushToTalk(scope, enabled, key);
  });
  ipcMain.handle(desktopChannels.showNotification, (event, ...args: unknown[]) => {
    authorize(event);
    const [notification] = notificationArgumentsSchema.parse(args);
    return notifications.show(notification);
  });
  ipcMain.handle(desktopChannels.setBadgeCount, (event, ...args: unknown[]) => {
    authorize(event);
    const [count] = badgeArgumentsSchema.parse(args);
    notifications.setBadge(count);
  });
  ipcMain.handle(desktopChannels.waitForNavigation, async (event, ...args: unknown[]) => {
    authorize(event);
    noArgumentsSchema.parse(args);
    const path = await navigation.wait();
    authorize(event);
    return path;
  });
  ipcMain.handle(desktopChannels.getIdleState, (event, ...args: unknown[]) => {
    authorize(event);
    noArgumentsSchema.parse(args);
    return idle.getState();
  });
  ipcMain.handle(desktopChannels.resetNativeState, (event, ...args: unknown[]) => {
    authorize(event);
    noArgumentsSchema.parse(args);
    notifications.reset();
    const contents = getContents();
    youtube.cancel();
    if (contents) resetOAuthPopups(contents);
  });
}
