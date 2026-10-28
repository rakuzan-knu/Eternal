import { NotificationType } from '@prisma/client';

export type PushLocale = 'en' | 'uk';

export interface PushPrivacy {
  showName: boolean;
  showText: boolean;
}

export interface PushCopy {
  title: string;
  body: string;
}

const APP = 'Eternal';

const ACTIONS: Record<NotificationType, Record<PushLocale, string>> = {
  LIKE_POST: { en: 'liked your post', uk: 'оцінює ваш допис' },
  LIKE_COMMENT: { en: 'liked your comment', uk: 'оцінює ваш коментар' },
  COMMENT: { en: 'commented on your post', uk: 'коментує ваш допис' },
  FOLLOW: { en: 'started following you', uk: 'тепер стежить за вами' },
  REPOST: { en: 'reposted your post', uk: 'поширює ваш допис' },
  MENTION: { en: 'mentioned you', uk: 'згадує вас' },
  SYSTEM_VERIFIED: { en: 'Your account is verified', uk: 'Ваш акаунт підтверджено' },
  SYSTEM_VIEW: { en: 'New activity on your profile', uk: 'Нова активність у вашому профілі' },
  SYSTEM: { en: 'You have a new notification', uk: 'У вас нове сповіщення' },
};

const GENERIC = {
  notification: { en: 'You have a new notification', uk: 'У вас нове сповіщення' },
  someone: { en: 'Someone', uk: 'Хтось' },
  message: { en: 'New message', uk: 'Нове повідомлення' },
  messageFrom: { en: 'New message from {name}', uk: 'Нове повідомлення від {name}' },
  photo: { en: 'Photo', uk: 'Фото' },
  attachment: { en: 'Attachment', uk: 'Вкладення' },
} satisfies Record<string, Record<PushLocale, string>>;

const SYSTEM_TYPES = new Set<NotificationType>([
  NotificationType.SYSTEM,
  NotificationType.SYSTEM_VERIFIED,
  NotificationType.SYSTEM_VIEW,
]);

const clip = (value: string, max = 160) =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

export function notificationPushCopy(
  type: NotificationType,
  locale: PushLocale,
  privacy: PushPrivacy,
  actorName: string | null,
  text: string | null,
): PushCopy {
  if (SYSTEM_TYPES.has(type)) {
    const body = privacy.showText && text ? clip(text) : ACTIONS[type][locale];
    return { title: APP, body };
  }
  if (!privacy.showName) return { title: APP, body: GENERIC.notification[locale] };
  const name = actorName || GENERIC.someone[locale];
  return { title: APP, body: `${name} ${ACTIONS[type][locale]}` };
}

export interface MessagePushInput {
  locale: PushLocale;
  privacy: PushPrivacy;
  senderName: string;
  conversationName: string | null;
  isGroup: boolean;
  encrypted: boolean;
  text: string | null;
  attachmentKind: 'photo' | 'file' | null;
}

export function messagePushCopy(input: MessagePushInput): PushCopy {
  const { locale, privacy } = input;
  if (!privacy.showName) return { title: APP, body: GENERIC.message[locale] };
  const title = input.isGroup
    ? clip(input.conversationName || GENERIC.message[locale], 60)
    : input.senderName;
  const preview =
    privacy.showText && !input.encrypted
      ? input.text?.trim()
        ? clip(input.text.trim())
        : input.attachmentKind === 'photo'
          ? GENERIC.photo[locale]
          : input.attachmentKind === 'file'
            ? GENERIC.attachment[locale]
            : null
      : null;
  if (!preview)
    return {
      title,
      body: input.isGroup
        ? GENERIC.messageFrom[locale].replace('{name}', input.senderName)
        : GENERIC.message[locale],
    };
  return { title, body: input.isGroup ? `${input.senderName}: ${preview}` : preview };
}
