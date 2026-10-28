import { z } from 'zod';

export const PUSH_PLATFORMS = ['ios', 'android'] as const;
export const PUSH_LOCALES = ['en', 'uk'] as const;

export const registerPushDeviceSchema = z.object({
  token: z
    .string()
    .trim()
    .max(256)
    .regex(/^Expo(nent)?PushToken\[[\w-]+\]$/, 'Invalid Expo push token'),
  platform: z.enum(PUSH_PLATFORMS),
  locale: z.enum(PUSH_LOCALES).default('en'),
});
export type RegisterPushDeviceDto = z.infer<typeof registerPushDeviceSchema>;

export interface PushDeviceView {
  token: string;
  platform: (typeof PUSH_PLATFORMS)[number];
  locale: (typeof PUSH_LOCALES)[number];
}

export const PUSH_DATA_KINDS = ['notification', 'message'] as const;

export interface PushNotificationData {
  kind: 'notification';
  notificationType: string;
  postId?: string;
  actorUsername?: string;
}

export interface PushMessageData {
  kind: 'message';
  conversationId: string;
}

export type PushData = PushNotificationData | PushMessageData;
