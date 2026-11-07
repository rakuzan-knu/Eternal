import { z } from 'zod';
import type { UpdateChannel, UpdateState } from './updates';

export const desktopChannels = {
  getInfo: 'desktop:get-info',
  openExternal: 'desktop:open-external',
  connectYouTube: 'desktop:connect-youtube',
  cancelYouTube: 'desktop:cancel-youtube',
  setCallActive: 'desktop:set-call-active',
  waitForCallAction: 'desktop:wait-for-call-action',
  configurePushToTalk: 'desktop:configure-push-to-talk',
  showNotification: 'desktop:show-notification',
  setBadgeCount: 'desktop:set-badge-count',
  waitForNavigation: 'desktop:wait-for-navigation',
  getIdleState: 'desktop:get-idle-state',
  resetNativeState: 'desktop:reset-native-state',
  getUpdateState: 'desktop:get-update-state',
  checkForUpdates: 'desktop:check-for-updates',
  setUpdateChannel: 'desktop:set-update-channel',
  downloadUpdate: 'desktop:download-update',
  installUpdate: 'desktop:install-update',
  openUpdateDownload: 'desktop:open-update-download',
} as const;

export const desktopInfoSchema = z.object({
  version: z.string().min(1).max(64),
  platform: z.enum(['win32', 'darwin', 'linux']),
});

export const externalUrlSchema = z
  .string()
  .min(1)
  .max(4096)
  .refine((value) => {
    if (
      [...value].some(
        (character) => character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
      )
    )
      return false;
    try {
      const url = new URL(value);
      return (
        (url.protocol === 'https:' || url.protocol === 'mailto:') &&
        !url.username &&
        !url.password &&
        (url.protocol !== 'https:' || Boolean(url.hostname))
      );
    } catch {
      return false;
    }
  });

export const noArgumentsSchema = z.tuple([]);
export const externalArgumentsSchema = z.tuple([externalUrlSchema]);
export const callActiveArgumentsSchema = z.tuple([z.enum(['call', 'mesh']), z.boolean()]);
export const callActionArgumentsSchema = z.tuple([z.enum(['call', 'mesh'])]);
export const callActionSchema = z.enum(['mute', 'none', 'ptt-down', 'ptt-up', 'ptt-reset']);
export const pushToTalkArgumentsSchema = z.tuple([
  z.enum(['call', 'mesh']),
  z.boolean(),
  z
    .string()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z0-9]+$/),
]);
export type CallScope = z.infer<typeof callActionArgumentsSchema>[0];
export type CallAction = z.infer<typeof callActionSchema>;

export const internalPathSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine((value) => {
    if (
      !value.startsWith('/') ||
      /[\\\s]/.test(value) ||
      [...value].some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      )
    )
      return false;
    try {
      const url = new URL(value, 'https://eternal.invalid');
      return (
        url.origin === 'https://eternal.invalid' &&
        !/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(url.pathname)
      );
    } catch {
      return false;
    }
  });
export const notificationSchema = z.object({
  title: z.string().trim().min(1).max(256),
  body: z.string().max(4096),
  path: internalPathSchema,
  tag: z.string().max(256).optional(),
});
export const notificationArgumentsSchema = z.tuple([notificationSchema]);
export const badgeArgumentsSchema = z.tuple([z.number().int().min(0).max(999999)]);
export const navigationSchema = internalPathSchema.nullable();
export const idleStateSchema = z.enum(['active', 'idle', 'locked', 'unknown']);
export type DesktopNotification = z.infer<typeof notificationSchema>;
export type DesktopIdleState = z.infer<typeof idleStateSchema>;

export interface DesktopBridge {
  readonly telemetryDisabled?: boolean;
  getInfo(): Promise<z.infer<typeof desktopInfoSchema>>;
  openExternal(url: string): Promise<void>;
  connectYouTube?(url: string, transaction: string): Promise<string | null>;
  cancelYouTube?(transaction: string): Promise<void>;
  setCallActive(scope: 'call' | 'mesh', active: boolean): Promise<void>;
  waitForCallAction(scope: CallScope): Promise<CallAction>;
  configurePushToTalk(scope: CallScope, enabled: boolean, key: string): Promise<boolean>;
  showNotification(notification: DesktopNotification): Promise<boolean>;
  setBadgeCount(count: number): Promise<void>;
  waitForNavigation(): Promise<string | null>;
  getIdleState(): Promise<DesktopIdleState>;
  resetNativeState(): Promise<void>;
  getUpdateState?(): Promise<UpdateState>;
  checkForUpdates?(): Promise<UpdateState>;
  setUpdateChannel?(channel: UpdateChannel): Promise<UpdateState>;
  downloadUpdate?(): Promise<UpdateState>;
  installUpdate?(): Promise<void>;
  openUpdateDownload?(): Promise<void>;
}
