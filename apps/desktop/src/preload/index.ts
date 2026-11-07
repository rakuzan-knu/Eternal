import { contextBridge, ipcRenderer } from 'electron';
import { initializeDisplayPicker } from './displayPicker';
import {
  youtubeConnectArgumentsSchema,
  youtubeCancelArgumentsSchema,
  youtubeResultSchema,
} from '../shared/youtubeOAuth';
import {
  updateStateSchema,
  updateChannelArgumentsSchema,
  type UpdateChannel,
} from '../shared/updates';
import {
  desktopChannels,
  callActiveArgumentsSchema,
  callActionArgumentsSchema,
  callActionSchema,
  pushToTalkArgumentsSchema,
  type CallScope,
  desktopInfoSchema,
  externalUrlSchema,
  type DesktopBridge,
  notificationSchema,
  type DesktopNotification,
  badgeArgumentsSchema,
  navigationSchema,
  idleStateSchema,
} from '../shared/ipcContract';

const bridge: DesktopBridge = Object.freeze({
  telemetryDisabled: process.argv.includes('--eternal-disable-telemetry'),
  async getInfo() {
    return desktopInfoSchema.parse(await ipcRenderer.invoke(desktopChannels.getInfo));
  },
  async openExternal(url: string) {
    await ipcRenderer.invoke(desktopChannels.openExternal, externalUrlSchema.parse(url));
  },
  async connectYouTube(url: string, transaction: string) {
    const args = youtubeConnectArgumentsSchema.parse([url, transaction]);
    return youtubeResultSchema.parse(
      await ipcRenderer.invoke(desktopChannels.connectYouTube, ...args),
    );
  },
  async cancelYouTube(transaction: string) {
    const args = youtubeCancelArgumentsSchema.parse([transaction]);
    await ipcRenderer.invoke(desktopChannels.cancelYouTube, ...args);
  },
  async setCallActive(scope: 'call' | 'mesh', active: boolean) {
    const args = callActiveArgumentsSchema.parse([scope, active]);
    await ipcRenderer.invoke(desktopChannels.setCallActive, ...args);
  },
  async waitForCallAction(scope: CallScope) {
    const args = callActionArgumentsSchema.parse([scope]);
    return callActionSchema.parse(
      await ipcRenderer.invoke(desktopChannels.waitForCallAction, ...args),
    );
  },
  async configurePushToTalk(scope: CallScope, enabled: boolean, key: string) {
    const args = pushToTalkArgumentsSchema.parse([scope, enabled, key]);
    const result: unknown = await ipcRenderer.invoke(desktopChannels.configurePushToTalk, ...args);
    if (typeof result !== 'boolean') throw new Error('Invalid push-to-talk status');
    return result;
  },
  async showNotification(notification: DesktopNotification) {
    const result: unknown = await ipcRenderer.invoke(
      desktopChannels.showNotification,
      notificationSchema.parse(notification),
    );
    if (typeof result !== 'boolean') throw new Error('Invalid notification status');
    return result;
  },
  async setBadgeCount(count: number) {
    const args = badgeArgumentsSchema.parse([count]);
    await ipcRenderer.invoke(desktopChannels.setBadgeCount, ...args);
  },
  async waitForNavigation() {
    return navigationSchema.parse(await ipcRenderer.invoke(desktopChannels.waitForNavigation));
  },
  async getIdleState() {
    return idleStateSchema.parse(await ipcRenderer.invoke(desktopChannels.getIdleState));
  },
  async resetNativeState() {
    await ipcRenderer.invoke(desktopChannels.resetNativeState);
  },
  async getUpdateState() {
    return updateStateSchema.parse(await ipcRenderer.invoke(desktopChannels.getUpdateState));
  },
  async checkForUpdates() {
    return updateStateSchema.parse(await ipcRenderer.invoke(desktopChannels.checkForUpdates));
  },
  async setUpdateChannel(channel: UpdateChannel) {
    const args = updateChannelArgumentsSchema.parse([channel]);
    return updateStateSchema.parse(
      await ipcRenderer.invoke(desktopChannels.setUpdateChannel, ...args),
    );
  },
  async downloadUpdate() {
    return updateStateSchema.parse(await ipcRenderer.invoke(desktopChannels.downloadUpdate));
  },
  async installUpdate() {
    await ipcRenderer.invoke(desktopChannels.installUpdate);
  },
  async openUpdateDownload() {
    await ipcRenderer.invoke(desktopChannels.openUpdateDownload);
  },
});

if (process.isMainFrame && process.argv.includes('--eternal-display-picker')) {
  initializeDisplayPicker();
} else if (process.isMainFrame) {
  contextBridge.exposeInMainWorld('desktop', bridge);
}
