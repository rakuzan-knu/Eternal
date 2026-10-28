import { Injectable, Logger, Optional } from '@nestjs/common';
import { NotificationType, type Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../../redis/redis.service';
import { ExpoPushClient, type ExpoPushMessage } from './expo-push.client';
import { messagePushCopy, notificationPushCopy, type PushPrivacy } from './push-copy';
import { PushDevicesService } from './push-devices.service';

export interface NotificationPushInput {
  userId: string;
  type: string;
  actorId?: string | null;
  postId?: string | null;
  text?: string | null;
}

export interface MessagePushInput {
  messageId: string;
  conversationId: string;
  senderId: string;
}

interface RecipientSettings extends PushPrivacy {
  enableNotifications: boolean;
  dndUntil: Date | null;
  mutedActorIds: string[];
  privateChats: boolean;
  groups: boolean;
  likes: boolean;
  comments: boolean;
  reposts: boolean;
  followers: boolean;
  mentions: boolean;
  system: boolean;
}

const DEFAULTS: RecipientSettings = {
  enableNotifications: true,
  dndUntil: null,
  mutedActorIds: [],
  showName: true,
  showText: true,
  privateChats: true,
  groups: true,
  likes: true,
  comments: true,
  reposts: true,
  followers: true,
  mentions: true,
  system: true,
};

const MESSAGE_LOCK_MS = 10 * 60_000;
const MUTED_LEVELS = new Set(['MESSAGES', 'MESSAGES_AND_CALLS']);

const isNotificationType = (value: string): value is NotificationType =>
  Object.values(NotificationType).includes(value as NotificationType);

export function allowsCategory(settings: RecipientSettings, type: NotificationType): boolean {
  switch (type) {
    case NotificationType.LIKE_POST:
    case NotificationType.LIKE_COMMENT:
      return settings.likes;
    case NotificationType.COMMENT:
      return settings.comments;
    case NotificationType.REPOST:
      return settings.reposts;
    case NotificationType.FOLLOW:
      return settings.followers;
    case NotificationType.MENTION:
      return settings.mentions;
    default:
      return settings.system;
  }
}

export function quiet(settings: RecipientSettings, actorId: string | null, now = Date.now()) {
  if (!settings.enableNotifications) return true;
  if (settings.dndUntil && settings.dndUntil.getTime() > now) return true;
  return !!actorId && settings.mutedActorIds.includes(actorId);
}

export interface ParticipantPrefs {
  muteLevel: string;
  mutedUntil: Date | null;
  notificationMode: string | null;
  communityMode: string | null;
  communityMutedUntil: Date | null;
}

export function messageAllowed(
  prefs: ParticipantPrefs,
  mentioned: boolean,
  now = Date.now(),
): boolean {
  if (MUTED_LEVELS.has(prefs.muteLevel) && (!prefs.mutedUntil || prefs.mutedUntil.getTime() > now))
    return false;
  if (prefs.communityMutedUntil && prefs.communityMutedUntil.getTime() > now) return false;
  const mode = prefs.notificationMode ?? prefs.communityMode ?? 'ALL';
  if (mode === 'NONE') return false;
  return mode !== 'MENTIONS' || mentioned;
}

@Injectable()
export class PushDispatchService {
  private readonly logger = new Logger(PushDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: PushDevicesService,
    private readonly client: ExpoPushClient,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async notify(input: NotificationPushInput): Promise<void> {
    if (!this.client.enabled() || !isNotificationType(input.type)) return;
    const type = input.type;
    const actorId = input.actorId ?? null;
    if (actorId === input.userId) return;
    const targets = await this.devices.targets([input.userId]);
    if (!targets.length) return;
    const settings = (await this.settings([input.userId])).get(input.userId) ?? DEFAULTS;
    if (quiet(settings, actorId) || !allowsCategory(settings, type)) return;
    const actor = actorId
      ? await this.prisma.user.findUnique({
          where: { id: actorId },
          select: { displayName: true, username: true },
        })
      : null;
    const actorName = actor ? actor.displayName || actor.username : null;
    await this.deliver(
      targets.map((target) => {
        const copy = notificationPushCopy(
          type,
          target.locale,
          settings,
          actorName,
          input.text ?? null,
        );
        return {
          to: target.token,
          ...copy,
          sound: 'default',
          channelId: 'activity',
          data: {
            kind: 'notification',
            notificationType: type,
            ...(input.postId ? { postId: input.postId } : {}),
            ...(actor && type === NotificationType.FOLLOW ? { actorUsername: actor.username } : {}),
          },
        };
      }),
    );
  }

  async message(input: MessagePushInput): Promise<void> {
    if (!this.client.enabled() || !input.messageId) return;
    if (!(await this.claim(`push:message:${input.messageId}`))) return;
    const message = await this.prisma.message.findUnique({
      where: { id: input.messageId },
      select: {
        body: true,
        senderId: true,
        deletedForAll: true,
        messageType: true,
        mentionedUserIds: true,
        attachments: { select: { type: true }, take: 1 },
        sender: { select: { displayName: true, username: true } },
        conversation: {
          select: {
            id: true,
            type: true,
            name: true,
            communityChannel: { select: { communityId: true, name: true } },
            participants: {
              where: { leftAt: null, userId: { not: input.senderId } },
              select: { userId: true, muteLevel: true, mutedUntil: true, notificationMode: true },
            },
          },
        },
      },
    });
    if (!message || message.deletedForAll || message.messageType === 'CALL_LOG') return;
    const conversation = message.conversation;
    const recipients = conversation.participants;
    if (!recipients.length) return;
    const communityId = conversation.communityChannel?.communityId ?? null;
    const memberships = communityId
      ? await this.prisma.communityMember.findMany({
          where: { communityId, userId: { in: recipients.map((item) => item.userId) } },
          select: { userId: true, notificationMode: true, notificationMutedUntil: true },
        })
      : [];
    const membership = new Map(memberships.map((item) => [item.userId, item]));
    const mentioned = new Set(message.mentionedUserIds);
    const isGroup = conversation.type === 'GROUP';
    const allowed = recipients.filter((item) =>
      messageAllowed(
        {
          muteLevel: item.muteLevel,
          mutedUntil: item.mutedUntil,
          notificationMode: item.notificationMode,
          communityMode: membership.get(item.userId)?.notificationMode ?? null,
          communityMutedUntil: membership.get(item.userId)?.notificationMutedUntil ?? null,
        },
        mentioned.has(item.userId),
      ),
    );
    if (!allowed.length) return;
    const settings = await this.settings(allowed.map((item) => item.userId));
    const eligible = allowed
      .map((item) => item.userId)
      .filter((userId) => {
        const prefs = settings.get(userId) ?? DEFAULTS;
        if (quiet(prefs, message.senderId)) return false;
        return isGroup ? prefs.groups : prefs.privateChats;
      });
    const targets = await this.devices.targets(eligible);
    if (!targets.length) return;
    const senderName = message.sender.displayName || message.sender.username;
    const attachment = message.attachments[0]?.type;
    const conversationName = conversation.communityChannel
      ? `#${conversation.communityChannel.name}`
      : conversation.name;
    await this.deliver(
      targets.map((target) => {
        const prefs = settings.get(target.userId) ?? DEFAULTS;
        const copy = messagePushCopy({
          locale: target.locale,
          privacy: prefs,
          senderName,
          conversationName,
          isGroup,
          encrypted: !isGroup,
          text: message.body,
          attachmentKind: attachment
            ? attachment === 'IMAGE' || attachment === 'GIF'
              ? 'photo'
              : 'file'
            : null,
        });
        return {
          to: target.token,
          ...copy,
          sound: 'default',
          priority: 'high',
          channelId: 'messages',
          threadId: conversation.id,
          data: { kind: 'message', conversationId: conversation.id },
        };
      }),
    );
  }

  private async deliver(messages: ExpoPushMessage[]): Promise<void> {
    const result = await this.client.send(messages);
    if (result.invalidTokens.length) await this.devices.forget(result.invalidTokens);
    if (result.failed) this.logger.warn(`Push delivery failed for ${result.failed} message(s)`);
  }

  private async claim(key: string): Promise<boolean> {
    if (!this.redis) return true;
    try {
      return !!(await this.redis.acquireLock(key, MESSAGE_LOCK_MS));
    } catch {
      return true;
    }
  }

  private async settings(userIds: string[]): Promise<Map<string, RecipientSettings>> {
    const rows = await this.prisma.userNotificationSettings.findMany({
      where: { userId: { in: userIds } },
    } satisfies Prisma.UserNotificationSettingsFindManyArgs);
    return new Map(
      rows.map((row) => [
        row.userId,
        {
          enableNotifications: row.enableNotifications,
          dndUntil: row.dndUntil,
          mutedActorIds: row.mutedActorIds,
          showName: row.showName,
          showText: row.showText,
          privateChats: row.privateChats,
          groups: row.groups,
          likes: row.likes,
          comments: row.comments,
          reposts: row.reposts,
          followers: row.followers,
          mentions: row.mentions,
          system: row.system,
        },
      ]),
    );
  }
}
