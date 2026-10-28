import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PushData, RegisterPushDeviceDto } from '@social-network/shared-contracts';
import { getMobileApi } from '@/shared/api/client';
import { getLanguage, tr } from '@/shared/lib/i18n';

export type PushStatus = 'enabled' | 'off' | 'blocked' | 'unsupported' | 'unconfigured';

const TOKEN_KEY = 'mobile-push-token';
const OPT_OUT_KEY = 'mobile-push-opt-out';

let visibleConversation: string | null = null;

export function setVisibleConversation(id: string | null) {
  visibleConversation = id;
}

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

export function pushData(value: unknown): PushData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (data.kind === 'message' && typeof data.conversationId === 'string')
    return { kind: 'message', conversationId: data.conversationId };
  if (data.kind === 'notification' && typeof data.notificationType === 'string')
    return {
      kind: 'notification',
      notificationType: data.notificationType,
      ...(typeof data.postId === 'string' ? { postId: data.postId } : {}),
      ...(typeof data.actorUsername === 'string' ? { actorUsername: data.actorUsername } : {}),
    };
  return null;
}

export function configurePushPresentation() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = pushData(notification.request.content.data);
      const hidden = data?.kind === 'message' && data.conversationId === visibleConversation;
      return {
        shouldShowAlert: !hidden,
        shouldShowBanner: !hidden,
        shouldShowList: !hidden,
        shouldPlaySound: !hidden,
        shouldSetBadge: false,
      };
    },
  });
}

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('messages', {
    name: tr('Messages'),
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#a855f7',
  });
  await Notifications.setNotificationChannelAsync('activity', {
    name: tr('Activity'),
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#a855f7',
  });
}

export async function pushStatus(): Promise<PushStatus> {
  if (!Device.isDevice) return 'unsupported';
  if (!projectId()) return 'unconfigured';
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return permission.canAskAgain ? 'off' : 'blocked';
  return (await AsyncStorage.getItem(TOKEN_KEY)) ? 'enabled' : 'off';
}

export async function enablePush(ask: boolean): Promise<PushStatus> {
  if (!Device.isDevice) return 'unsupported';
  const id = projectId();
  if (!id) return 'unconfigured';
  await ensureChannels();
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && ask && permission.canAskAgain)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return permission.canAskAgain ? 'off' : 'blocked';
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  const body: RegisterPushDeviceDto = {
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    locale: getLanguage(),
  };
  await getMobileApi().post('/notifications/push-devices', body);
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.removeItem(OPT_OUT_KEY);
  return 'enabled';
}

export async function disablePush(optOut: boolean): Promise<void> {
  if (optOut) await AsyncStorage.setItem(OPT_OUT_KEY, '1');
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  try {
    await getMobileApi().delete(`/notifications/push-devices/${encodeURIComponent(token)}`);
  } finally {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export async function refreshPush(): Promise<void> {
  if (!Device.isDevice || (await AsyncStorage.getItem(OPT_OUT_KEY))) return;
  const permission = await Notifications.getPermissionsAsync();
  if (permission.granted) await enablePush(false);
}

export function onPushOpened(handler: (data: PushData) => void): () => void {
  let handled: string | null = null;
  const open = (response: Notifications.NotificationResponse | null) => {
    if (!response || response.notification.request.identifier === handled) return;
    handled = response.notification.request.identifier;
    const data = pushData(response.notification.request.content.data);
    if (data) handler(data);
  };
  void Notifications.getLastNotificationResponseAsync()
    .then(open)
    .catch(() => {});
  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}
