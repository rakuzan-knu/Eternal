import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseFilters, forwardRef, Inject, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WS_EVENTS } from '../events/ws-events';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import { VisibilityResolver } from '../../users/privacy/visibility.resolver';
import { PrivacyDimension, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import { WsValidationFilter } from '../filters/ws-validation.filter';
import { JamService } from '../../integrations/jam.service';
import {
  type SendMessageDto,
  type EditMessageDto,
  type DeleteMessageDto,
  type ForwardMessageDto,
  type ReactToMessageDto,
  type TogglePinMessageDto,
  type ConversationIdDto,
  type MarkReadDto,
  type GetOnlineStatusDto,
  type GatewayResumeDto,
} from '@common/contracts';

interface AuthenticatedSocket extends Socket {
  userId: string;
}

const getCorsOrigin = () => {
  const envOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : [];
  return (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (
      !origin ||
      envOrigins.includes(origin) ||
      origin.startsWith('http://localhost:') ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  };
};

@UseFilters(WsValidationFilter)
@WebSocketGateway({
  namespace: '/messenger',
  cors: {
    origin: getCorsOrigin(),
    credentials: true,
  },
})
export class MessengerGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(MessengerGateway.name);
  private readonly onlineUsers = new Map<string, Set<string>>();
  private readonly hostSyncRateMap = new Map<string, number[]>();

  private readonly RATE_LIMIT = 20;
  private readonly RATE_WINDOW_MS = 10_000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messagesService: MessagesService,
    private readonly convsService: ConversationsService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => VisibilityResolver))
    private readonly visibility: VisibilityResolver,
    @Optional()
    private readonly prisma?: PrismaService,
    @Optional()
    private readonly jamService?: JamService,
  ) {}

  afterInit() {
    this.logger.log(`Messenger WebSocket Gateway initialised.`);
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) throw new WsException('Missing auth token');

      const payload = await this.jwtService.verifyAsync<{ sub: string; type: string }>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'access') throw new WsException('Invalid token type');

      const userId = payload.sub;
      (client as AuthenticatedSocket).userId = userId;

      const wasOffline = !this.onlineUsers.has(userId);
      if (!this.onlineUsers.has(userId)) this.onlineUsers.set(userId, new Set());
      this.onlineUsers.get(userId)!.add(client.id);

      // Track in Redis Socket Set for Multi-Tab Presence
      await this.redisService.sadd(`user:sockets:${userId}`, client.id).catch(() => {});
      await this.redisService.set(`user:presence:${userId}`, 'online', 60).catch(() => {});

      if (wasOffline) {
        await this.emitPresenceExceptBlocked(userId, WS_EVENTS.USER_ONLINE, { userId });
      }

      const seqRaw = await this.redisService.get(`user:seq:${userId}`).catch(() => '0');
      const currentSeq = Number(seqRaw || '0');
      client.emit(WS_EVENTS.GATEWAY_READY, { sessionId: client.id, seq: currentSeq });

      // Jam Session reconnect handling & Grace Period cancellation
      if (this.jamService) {
        this.jamService.cancelDisconnectGrace(`jam_${userId}`);
        this.jamService.cancelDisconnectGrace(`listener_${userId}`);
        void this.jamService.getRoomByUser(userId).then((room) => {
          if (room) {
            void client.join(`jam:${room.roomId}`);
            if (room.status === 'reconnecting' && room.hostUserId === userId) {
              room.status = 'active';
              this.server.to(`jam:${room.roomId}`).emit('jam:state_update', room);
            }
          }
        });
      }

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (err) {
      this.logger.warn(`Rejected connection: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.hostSyncRateMap.delete(client.id);
    const userId = (client as AuthenticatedSocket).userId;
    if (!userId) return;

    const userSockets = this.onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(client.id);
    }

    await this.redisService.srem(`user:sockets:${userId}`, client.id).catch(() => {});
    const remainingSockets = await this.redisService.scard(`user:sockets:${userId}`).catch(() => 0);

    // Only switch to offline if all tabs / sockets are closed
    if ((!userSockets || userSockets.size === 0) && remainingSockets === 0) {
      this.onlineUsers.delete(userId);
      await this.redisService.del(`user:presence:${userId}`).catch(() => {});
      void this.usersService.touchLastSeen(userId).catch(() => {});
      void this.emitPresenceExceptBlocked(userId, WS_EVENTS.USER_OFFLINE, { userId });

      // Handle 15s Grace Period for Jam Host / Listeners
      if (this.jamService) {
        void this.jamService.getRoomByUser(userId).then((room) => {
          if (room && room.hostUserId === userId) {
            this.server.to(`jam:${room.roomId}`).emit('jam:state_update', {
              ...room,
              status: 'reconnecting',
            });
          }
        });

        this.jamService.scheduleDisconnectGrace(userId, (roomId, closed, newHost) => {
          if (closed) {
            this.server.to(`jam:${roomId}`).emit('jam:room_closed', { roomId });
            this.server.in(`jam:${roomId}`).socketsLeave(`jam:${roomId}`);
          } else if (newHost) {
            this.server.to(`jam:${roomId}`).emit('jam:listener_left', {
              userId,
              newHost,
            });
            void this.jamService?.getRoom(roomId).then((r) => {
              if (r) this.server.to(`jam:${roomId}`).emit('jam:state_update', r);
            });
          } else {
            this.server.to(`jam:${roomId}`).emit('jam:listener_left', { userId });
            void this.jamService?.getRoom(roomId).then((r) => {
              if (r) this.server.to(`jam:${roomId}`).emit('jam:state_update', r);
            });
          }
        });
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(WS_EVENTS.GET_ONLINE_STATUS)
  async handleGetOnlineStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: GetOnlineStatusDto,
    callback?: (res: {
      status: string;
      online?: string[];
      activities?: Record<string, any>;
      error?: string;
    }) => void,
  ): Promise<void> {
    const onlineSubjects = payload.userIds.filter(
      (userId) => this.onlineUsers.has(userId) || (client.userId && userId === client.userId),
    );
    if (onlineSubjects.length === 0) {
      callback?.({ status: 'ok', online: [], activities: {} });
      return;
    }

    // Resolve each subject's LAST_SEEN visibility toward this viewer (block + privacy + exceptions).
    const ctx = await this.visibility.loadContext(onlineSubjects, client.userId);
    const online = onlineSubjects.filter((userId) =>
      this.visibility.resolve(PrivacyDimension.LAST_SEEN, userId, ctx),
    );

    const activities: Record<string, any> = {};
    if (online.length > 0 && this.prisma) {
      try {
        const showcases = await this.prisma.profileShowcase.findMany({
          where: {
            userId: { in: online },
            activityStatus: { not: Prisma.DbNull },
          },
          select: {
            userId: true,
            activityStatus: true,
            privacyActivity: true,
          },
        });

        for (const sc of showcases) {
          if (
            sc.activityStatus &&
            (sc.privacyActivity !== 'PRIVATE' || sc.userId === client.userId)
          ) {
            activities[sc.userId] = sc.activityStatus;
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch activities in handleGetOnlineStatus: ${err}`);
      }
    }

    callback?.({ status: 'ok', online, activities });
  }

  @SubscribeMessage(WS_EVENTS.JOIN_CONVERSATION)
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ConversationIdDto,
  ) {
    await this.convsService.assertMember(payload.conversationId, client.userId);
    await client.join(payload.conversationId);
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_CONVERSATION)
  async handleLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ConversationIdDto,
  ) {
    await client.leave(payload.conversationId);
  }

  @SubscribeMessage(WS_EVENTS.TYPING_START)
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ConversationIdDto,
  ) {
    const isTypingLimited = await this.isTypingRateLimited(client.userId).catch(() => false);
    if (isTypingLimited) return;

    await this.emitToConversationExceptBlocked(
      payload.conversationId,
      client.userId,
      WS_EVENTS.TYPING,
      {
        conversationId: payload.conversationId,
        userId: client.userId,
        isTyping: true,
      },
      { includeActor: false },
    );
  }

  @SubscribeMessage(WS_EVENTS.HEARTBEAT)
  async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = client.userId;
    if (!userId) return;
    await this.redisService.set(`user:presence:${userId}`, 'online', 45);
  }

  @SubscribeMessage(WS_EVENTS.TYPING_STOP)
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ConversationIdDto,
  ) {
    await this.emitToConversationExceptBlocked(
      payload.conversationId,
      client.userId,
      WS_EVENTS.TYPING,
      {
        conversationId: payload.conversationId,
        userId: client.userId,
        isTyping: false,
      },
      { includeActor: false },
    );
  }

  @SubscribeMessage(WS_EVENTS.MARK_READ)
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: MarkReadDto,
  ) {
    const isUpdated = await this.messagesService.markRead(
      payload.conversationId,
      client.userId,
      payload.messageId,
    );

    if (!isUpdated) return;

    await this.emitToConversationExceptBlocked(
      payload.conversationId,
      client.userId,
      WS_EVENTS.MESSAGE_READ,
      {
        conversationId: payload.conversationId,
        userId: client.userId,
        messageId: payload.messageId || null,
        readAt: new Date().toISOString(),
      },
      { includeActor: false },
    );
  }

  @SubscribeMessage(WS_EVENTS.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessageDto,
    callback?: (res: {
      status: string;
      message?: unknown;
      error?: string;
      clientMessageId?: string;
    }) => void,
  ): Promise<void> {
    const isLimited = await this.isRateLimited(client.userId).catch(() => false);
    if (isLimited) {
      const rateLimitError = 'Too many messages, slow down';
      client.emit(WS_EVENTS.RATE_LIMIT_EXCEEDED, { message: rateLimitError });
      callback?.({ status: 'error', error: rateLimitError });
      return;
    }

    await this.convsService.assertMember(payload.conversationId, client.userId);

    const message = await this.messagesService.send(payload.conversationId, client.userId, payload);

    await this.convsService.touchUpdatedAt(payload.conversationId);
    await this.emitToConversationExceptBlocked(
      payload.conversationId,
      client.userId,
      WS_EVENTS.NEW_MESSAGE,
      { conversationId: payload.conversationId, message, clientMessageId: payload.clientMessageId },
    );
    callback?.({ status: 'ok', message, clientMessageId: payload.clientMessageId });
  }

  @SubscribeMessage(WS_EVENTS.GATEWAY_RESUME)
  async handleGatewayResume(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: GatewayResumeDto,
    callback?: (res: {
      status: string;
      events?: any[];
      currentSeq?: number;
      error?: string;
    }) => void,
  ): Promise<void> {
    const userId = client.userId;
    if (!userId) {
      callback?.({ status: 'invalid_session' });
      return;
    }

    try {
      const bufferKey = `user:events:${userId}`;
      const seqRaw = await this.redisService.get(`user:seq:${userId}`).catch(() => '0');
      const currentSeq = Number(seqRaw || '0');

      // If sequence gap exceeds 500 events or requested sequence is ahead
      if (currentSeq > 0 && (currentSeq - payload.lastSeq > 500 || payload.lastSeq > currentSeq)) {
        client.emit(WS_EVENTS.RESYNC_REQUIRED, { currentSeq, reason: 'sequence_gap_too_large' });
        callback?.({ status: 'resync_required', currentSeq });
        return;
      }

      const rawEvents = await this.redisService.zrangebyscore(
        bufferKey,
        `(${payload.lastSeq}`,
        '+inf',
      );

      // If client is behind but buffer is empty (expired), trigger full state resync
      if (currentSeq > payload.lastSeq && rawEvents.length === 0) {
        client.emit(WS_EVENTS.RESYNC_REQUIRED, { currentSeq, reason: 'buffer_expired' });
        callback?.({ status: 'resync_required', currentSeq });
        return;
      }

      const events = rawEvents
        .map((str) => {
          try {
            return JSON.parse(str) as Record<string, unknown>;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      client.emit(WS_EVENTS.GATEWAY_RESUMED, { currentSeq, count: events.length });
      callback?.({ status: 'ok', events, currentSeq });
    } catch {
      client.emit(WS_EVENTS.RESYNC_REQUIRED, { reason: 'resume_error' });
      callback?.({ status: 'resync_required' });
    }
  }

  @SubscribeMessage(WS_EVENTS.EDIT_MESSAGE)
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: EditMessageDto,
    callback?: (res: { status: string; message?: unknown; error?: string }) => void,
  ): Promise<void> {
    const updatedMessage = await this.messagesService.edit(
      payload.messageId,
      client.userId,
      payload,
    );
    this.emitMessageEdited(updatedMessage.conversationId, updatedMessage);
    callback?.({ status: 'ok', message: updatedMessage });
  }

  @SubscribeMessage(WS_EVENTS.DELETE_MESSAGE)
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: DeleteMessageDto,
    callback?: (res: { status: string; deletedForAll: boolean; error?: string }) => void,
  ): Promise<void> {
    const msg = await this.messagesService['messagesRepo'].findOne(
      payload.messageId,
      client.userId,
    );

    const result = await this.messagesService.delete(payload.messageId, client.userId, payload);

    if (msg) {
      if (result.deletedForAll) {
        this.emitMessageDeleted(msg.conversationId, result.messageId, true);
      } else {
        this.emitToUser(client.userId, WS_EVENTS.MESSAGE_DELETED, {
          conversationId: msg.conversationId,
          messageId: result.messageId,
          deletedForAll: false,
        });
      }
    }

    callback?.({ status: 'ok', deletedForAll: result.deletedForAll });
  }

  @SubscribeMessage(WS_EVENTS.FORWARD_MESSAGE)
  async handleForwardMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ForwardMessageDto,
    callback?: (res: { status: string; messages?: unknown[]; error?: string }) => void,
  ): Promise<void> {
    const results = await this.messagesService.forward(payload.messageId, client.userId, payload);

    for (const msg of results) {
      await this.emitToConversationExceptBlocked(
        msg.conversationId,
        client.userId,
        WS_EVENTS.NEW_MESSAGE,
        { conversationId: msg.conversationId, message: msg },
      );
    }

    callback?.({ status: 'ok', messages: results });
  }

  @SubscribeMessage(WS_EVENTS.ADD_REACTION)
  async handleAddReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ReactToMessageDto,
    callback?: (res: { status: string; message?: unknown; error?: string }) => void,
  ): Promise<void> {
    try {
      const updated = await this.messagesService.addReaction(
        payload.messageId,
        client.userId,
        payload,
      );
      this.emitReactionAdded(updated.conversationId, updated);
      callback?.({ status: 'ok', message: updated });
    } catch (err: unknown) {
      callback?.({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to add reaction',
      });
    }
  }

  @SubscribeMessage(WS_EVENTS.REMOVE_REACTION)
  async handleRemoveReaction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: ReactToMessageDto,
    callback?: (res: { status: string; message?: unknown; error?: string }) => void,
  ): Promise<void> {
    try {
      const updated = await this.messagesService.removeReaction(
        payload.messageId,
        client.userId,
        payload.emoji,
      );
      this.emitReactionRemoved(updated.conversationId, updated);
      callback?.({ status: 'ok', message: updated });
    } catch (err: unknown) {
      callback?.({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to remove reaction',
      });
    }
  }

  @SubscribeMessage(WS_EVENTS.PIN_MESSAGE)
  async handlePinMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TogglePinMessageDto,
    callback?: (res: { status: string; error?: string }) => void,
  ): Promise<void> {
    try {
      await this.messagesService.pinMessage(
        payload.conversationId,
        payload.messageId,
        client.userId,
      );
      this.emitMessagePinned(payload.conversationId, payload.messageId);
      callback?.({ status: 'ok' });
    } catch (err: unknown) {
      callback?.({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to pin message',
      });
    }
  }

  @SubscribeMessage(WS_EVENTS.UNPIN_MESSAGE)
  async handleUnpinMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TogglePinMessageDto,
    callback?: (res: { status: string; error?: string }) => void,
  ): Promise<void> {
    try {
      await this.messagesService.unpinMessage(
        payload.conversationId,
        payload.messageId,
        client.userId,
      );
      this.emitMessageUnpinned(payload.conversationId, payload.messageId);
      callback?.({ status: 'ok' });
    } catch (err: unknown) {
      callback?.({
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to unpin message',
      });
    }
  }

  private async emitToConversationExceptBlocked(
    conversationId: string,
    actingUserId: string,
    event: string,
    payload: unknown,
    opts: { includeActor?: boolean } = {},
  ): Promise<void> {
    const includeActor = opts.includeActor ?? true;

    const [participantIds, { blockedByMe, blockingMe }] = await Promise.all([
      this.convsService.getParticipantIds(conversationId),
      this.convsService.getBlockRelationships(actingUserId),
    ]);

    for (const userId of participantIds) {
      if (userId === actingUserId) {
        if (includeActor) this.emitToUser(userId, event, payload);
        continue;
      }
      if (blockedByMe.has(userId) || blockingMe.has(userId)) continue;
      this.emitToUser(userId, event, payload);
    }
  }

  private async emitPresenceExceptBlocked(
    subjectUserId: string,
    event: string,
    payload: unknown,
  ): Promise<void> {
    const candidates = [...this.onlineUsers.keys()].filter((id) => id !== subjectUserId);
    if (candidates.length === 0) return;

    const audience = await this.visibility.resolvePresenceAudience(subjectUserId, candidates);

    for (const [userId, socketIds] of this.onlineUsers.entries()) {
      if (userId !== subjectUserId && !audience.has(userId)) continue;
      for (const socketId of socketIds) {
        this.server.to(socketId).emit(event, payload);
      }
    }
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    void (async () => {
      try {
        const seq = await this.redisService.incr(`user:seq:${userId}`);
        const wrapped = { seq, event, payload, timestamp: Date.now() };
        const bufferKey = `user:events:${userId}`;
        await this.redisService.zadd(bufferKey, seq, JSON.stringify(wrapped));
        await this.redisService.zremrangebyrank(bufferKey, 0, -500);
        await this.redisService.expire(bufferKey, 600);
      } catch {
        // Redis buffer error is non-fatal for direct emit
      }
    })();

    const socketIds = this.onlineUsers.get(userId);
    if (!socketIds) return;
    for (const socketId of socketIds) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  emitMessageEdited(conversationId: string, message: unknown) {
    this.server.to(conversationId).emit(WS_EVENTS.MESSAGE_EDITED, { conversationId, message });
  }

  emitMessageDeleted(conversationId: string, messageId: string, deletedForAll: boolean) {
    this.server
      .to(conversationId)
      .emit(WS_EVENTS.MESSAGE_DELETED, { conversationId, messageId, deletedForAll });
  }

  emitReactionAdded(conversationId: string, message: unknown) {
    this.server
      .to(conversationId)
      .emit(WS_EVENTS.MESSAGE_REACTION_ADDED, { conversationId, message });
  }

  emitReactionRemoved(conversationId: string, message: unknown) {
    this.server
      .to(conversationId)
      .emit(WS_EVENTS.MESSAGE_REACTION_REMOVED, { conversationId, message });
  }

  emitMessagePinned(conversationId: string, messageId: string) {
    this.server.to(conversationId).emit(WS_EVENTS.MESSAGE_PINNED, { conversationId, messageId });
  }

  emitMessageUnpinned(conversationId: string, messageId: string) {
    this.server.to(conversationId).emit(WS_EVENTS.MESSAGE_UNPINNED, { conversationId, messageId });
  }

  emitConversationDeleted(conversationId: string, participantUserIds: string[] = []) {
    this.server.to(conversationId).emit(WS_EVENTS.CONVERSATION_DELETED, { conversationId });
    for (const userId of participantUserIds) {
      this.emitToUser(userId, WS_EVENTS.CONVERSATION_DELETED, { conversationId });
    }
  }

  emitMessagesCleared(conversationId: string, participantUserIds: string[] = []) {
    this.server.to(conversationId).emit(WS_EVENTS.MESSAGES_CLEARED, { conversationId });
    for (const userId of participantUserIds) {
      this.emitToUser(userId, WS_EVENTS.MESSAGES_CLEARED, { conversationId });
    }
  }

  private async isRateLimited(userId: string): Promise<boolean> {
    const now = Date.now();
    const key = `rate_limit:messages:${userId}`;
    const clearBefore = now - this.RATE_WINDOW_MS;
    const member = `${now}:${Math.random()}`;

    const results = await this.redisService
      .getClient()
      .multi()
      .zremrangebyscore(key, 0, clearBefore)
      .zadd(key, now, member)
      .zcard(key)
      .pexpire(key, this.RATE_WINDOW_MS)
      .exec();

    if (!results) return false;
    const zcardRow = results[2];
    const totalRequestsInWindow = zcardRow && zcardRow[1] ? (zcardRow[1] as number) : 0;
    return totalRequestsInWindow > this.RATE_LIMIT;
  }

  private async isTypingRateLimited(userId: string): Promise<boolean> {
    const key = `rate_limit:typing:${userId}`;
    const exists = await this.redisService.exists(key);
    if (exists) return true;
    await this.redisService.set(key, '1', 4);
    return false;
  }

  @SubscribeMessage('subscribeShowcase')
  handleSubscribeShowcase(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string },
  ) {
    if (data?.targetUserId) {
      void client.join(`showcase:${data.targetUserId}`);
    }
  }

  @SubscribeMessage('unsubscribeShowcase')
  handleUnsubscribeShowcase(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string },
  ) {
    if (data?.targetUserId) {
      void client.leave(`showcase:${data.targetUserId}`);
    }
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  @OnEvent('showcase.presence.updated')
  handleShowcasePresenceUpdated(payload: {
    userId: string;
    activityStatus: unknown;
    connectedAccounts?: unknown;
    isPrivate?: boolean;
  }) {
    if (payload?.userId) {
      this.server.to(`showcase:${payload.userId}`).emit('showcase:presence:update', payload);

      if (!payload.isPrivate) {
        this.emitToUser(payload.userId, 'user:activity:changed', {
          userId: payload.userId,
          activityStatus: payload.activityStatus,
          connectedAccounts: payload.connectedAccounts,
        });
        void this.emitPresenceExceptBlocked(payload.userId, 'user:activity:changed', {
          userId: payload.userId,
          activityStatus: payload.activityStatus,
          connectedAccounts: payload.connectedAccounts,
        });
      } else {
        this.emitToUser(payload.userId, 'user:activity:changed', {
          userId: payload.userId,
          activityStatus: null,
        });
        void this.emitPresenceExceptBlocked(payload.userId, 'user:activity:changed', {
          userId: payload.userId,
          activityStatus: null,
        });
      }
    }
  }

  @SubscribeMessage('subscribeStory')
  handleSubscribeStory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { storyId: string },
  ) {
    if (data?.storyId) {
      void client.join(`story:${data.storyId}`);
    }
  }

  @SubscribeMessage('unsubscribeStory')
  handleUnsubscribeStory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { storyId: string },
  ) {
    if (data?.storyId) {
      void client.leave(`story:${data.storyId}`);
    }
  }

  @OnEvent('story.created')
  handleStoryCreated(payload: { authorId: string; story: any }) {
    if (payload?.authorId) {
      // Broadcast new story event so follower clients instantly light up glowing StoryAvatar rings
      this.server.emit('story:new', payload);
    }
  }

  @OnEvent('story.viewed')
  handleStoryViewed(payload: {
    storyId: string;
    authorId: string;
    viewerId: string;
    viewer: any;
    viewedAt: string;
  }) {
    if (payload?.storyId) {
      // Broadcast to room of active viewers/author for this story
      this.server.to(`story:${payload.storyId}`).emit('story:viewed', payload);
    }
  }

  @OnEvent('story.reacted')
  handleStoryReacted(payload: {
    storyId: string;
    authorId: string;
    userId: string;
    user: any;
    emoji: string;
    createdAt: string;
  }) {
    if (payload?.storyId) {
      this.server.to(`story:${payload.storyId}`).emit('story:reacted', payload);
    }
  }

  @OnEvent('story.poll_voted')
  handleStoryPollVoted(payload: {
    storyId: string;
    authorId: string;
    userId: string;
    pollResult: any;
    optionIndex: number;
  }) {
    if (payload?.storyId) {
      this.server.to(`story:${payload.storyId}`).emit('story:poll_voted', payload);
    }
  }

  @OnEvent('story.deleted')
  handleStoryDeleted(payload: { storyId: string; authorId: string }) {
    if (payload?.storyId) {
      this.server.emit('story:deleted', payload);
      this.server.to(`story:${payload.storyId}`).emit('story:deleted', payload);
    }
  }

  // =========================================================================
  // JAM / LISTEN ALONG WEBSOCKET HANDLERS
  // =========================================================================

  /**
   * Cristian's Algorithm: RTT Ping-Pong for high-precision server time synchronization
   */
  @SubscribeMessage('jam:ping')
  handleJamPing(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { t0: number },
  ) {
    client.emit('jam:pong', {
      t0: payload?.t0,
      serverTime: Date.now(),
    });
  }

  /**
   * Host creates a new Jam room
   */
  @SubscribeMessage('jam:create')
  async handleJamCreate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { initialTrack?: any; queuePolicy?: 'dj_only' | 'open_queue' },
  ) {
    const userId = client.userId;
    if (!userId || !this.jamService) return;

    this.jamService.cancelDisconnectGrace(`jam_${userId}`);
    const user = await this.usersService.findById(userId).catch(() => null);
    const hostProfile = {
      username: user?.username || 'User',
      avatar: user?.avatar || undefined,
    };

    const room = await this.jamService.createRoom(
      userId,
      hostProfile,
      payload?.initialTrack || null,
      payload?.queuePolicy || 'dj_only',
    );

    void client.join(`jam:${room.roomId}`);
    this.server.to(`jam:${room.roomId}`).emit('jam:state_update', room);

    // Synchronize host real-time activity presence across network
    if (payload?.initialTrack) {
      await this.broadcastPlatformMusicActivity(userId, payload.initialTrack, true, 0, room.roomId);
    }
  }

  /**
   * Listener joins an existing Jam room
   */
  @SubscribeMessage('jam:join')
  async handleJamJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    const userId = client.userId;
    if (!userId || !payload?.roomId || !this.jamService) return;

    const user = await this.usersService.findById(userId).catch(() => null);
    const listenerProfile = {
      username: user?.username || 'User',
      avatar: user?.avatar || undefined,
    };

    const res = await this.jamService.joinRoom(payload.roomId, userId, listenerProfile);
    if (!res) {
      client.emit('jam:error', { message: 'Listening room not found' });
      return;
    }

    void client.join(`jam:${payload.roomId}`);
    client.emit('jam:state_update', res.room);
    this.server.to(`jam:${payload.roomId}`).emit('jam:listener_joined', {
      listener: {
        id: userId,
        username: listenerProfile.username,
        avatar: listenerProfile.avatar,
      },
      room: res.room,
    });
  }

  /**
   * Listener or Host leaves the room
   */
  @SubscribeMessage('jam:leave')
  async handleJamLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    const userId = client.userId;
    if (!userId || !payload?.roomId || !this.jamService) return;

    void client.leave(`jam:${payload.roomId}`);
    const res = await this.jamService.leaveRoom(payload.roomId, userId);

    if (res.closed) {
      this.server.to(`jam:${payload.roomId}`).emit('jam:room_closed', { roomId: payload.roomId });
    } else if (res.room) {
      this.server.to(`jam:${payload.roomId}`).emit('jam:listener_left', {
        userId,
        newHost: res.newHost,
      });
      this.server.to(`jam:${payload.roomId}`).emit('jam:state_update', res.room);
    }
  }

  /**
   * Host Authority Sync Heartbeat & Seek/Play/Pause Broadcast
   * Protected with 3 events/sec rate limiter per socket
   */
  @SubscribeMessage('jam:host_sync')
  async handleJamHostSync(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      roomId: string;
      trackId?: string;
      positionMs: number;
      isPlaying: boolean;
      timestamp: number;
      currentTrack?: any;
    },
  ) {
    const userId = client.userId;
    if (!userId || !payload?.roomId || !this.jamService) return;

    // Rate-limiting guard: maximum 3 sync events per second per socket
    const now = Date.now();
    const timestamps = (this.hostSyncRateMap.get(client.id) || []).filter((t) => now - t < 1000);
    if (timestamps.length >= 3) {
      return;
    }
    timestamps.push(now);
    this.hostSyncRateMap.set(client.id, timestamps);

    const syncResult = await this.jamService.hostSync(payload.roomId, userId, payload);
    if (syncResult) {
      client.to(`jam:${payload.roomId}`).emit('jam:sync_event', syncResult);
    }
  }

  /**
   * Pre-buffering / Gapless playback signal for upcoming track
   */
  @SubscribeMessage('jam:preload_next')
  async handleJamPreloadNext(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; trackId: string; streamUrl?: string },
  ) {
    const userId = client.userId;
    if (!userId || !payload?.roomId || !payload?.trackId || !this.jamService) return;

    const recorded = await this.jamService.recordPreload(payload.roomId, userId, payload.trackId);
    if (recorded) {
      client.to(`jam:${payload.roomId}`).emit('jam:preload_next', {
        trackId: payload.trackId,
        streamUrl: payload.streamUrl,
      });
    }
  }

  /**
   * Add track to room queue (enforces dj_only vs open_queue & Spotify Premium)
   */
  @SubscribeMessage('jam:queue_add')
  async handleJamQueueAdd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; track: any },
  ) {
    const userId = client.userId;
    if (!userId || !payload?.roomId || !payload?.track || !this.jamService) return;

    const res = await this.jamService.queueAdd(payload.roomId, userId, payload.track);
    if (res.success && res.room) {
      this.server.to(`jam:${payload.roomId}`).emit('jam:state_update', res.room);
    } else {
      client.emit('jam:error', { message: res.error || 'Failed to add track to queue' });
    }
  }

  /**
   * Host updates queue policy ('dj_only' vs 'open_queue')
   */
  @SubscribeMessage('jam:update_policy')
  async handleJamUpdatePolicy(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string; queuePolicy: 'dj_only' | 'open_queue' },
  ) {
    const userId = client.userId;
    if (!userId || !payload?.roomId || !payload?.queuePolicy || !this.jamService) return;

    const updated = await this.jamService.updatePolicy(payload.roomId, userId, payload.queuePolicy);
    if (updated) {
      this.server.to(`jam:${payload.roomId}`).emit('jam:state_update', updated);
    }
  }

  /**
   * Real-time platform music playback activity update from web player
   */
  @SubscribeMessage('user:activity:platform_music')
  async handlePlatformMusicActivity(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      track: any;
      isPlaying: boolean;
      progressMs: number;
      durationMs: number;
      jamRoomId?: string;
    },
  ) {
    const userId = client.userId;
    if (!userId) return;

    await this.broadcastPlatformMusicActivity(
      userId,
      payload.track,
      payload.isPlaying,
      payload.progressMs,
      payload.jamRoomId,
    );
  }

  /**
   * Helper to persist and broadcast platform music activity
   */
  private async broadcastPlatformMusicActivity(
    userId: string,
    track: any | null,
    isPlaying: boolean,
    progressMs: number = 0,
    jamRoomId?: string,
  ) {
    if (!this.prisma) return;

    try {
      const showcase = await this.prisma.profileShowcase.findUnique({
        where: { userId },
      });
      if (!showcase) return;

      const isPrivate = showcase.privacyActivity === 'PRIVATE';

      if (!track) {
        await this.prisma.profileShowcase.update({
          where: { userId },
          data: { activityStatus: Prisma.DbNull },
        });
        this.handleShowcasePresenceUpdated({
          userId,
          activityStatus: null,
          connectedAccounts: showcase.connectedAccounts,
          isPrivate,
        });
        return;
      }

      const activityStatus = {
        type: 'spotify',
        title: track.title,
        subtitle: track.artist || 'Music Hub',
        artist: track.artist,
        imageUrl: track.albumArt || null,
        externalUrl: track.spotifyUrl || null,
        trackId: track.id,
        progressMs,
        durationMs: track.durationMs || 180000,
        startedAt: new Date(Date.now() - progressMs).toISOString(),
        updatedAt: Date.now(),
        isPaused: !isPlaying,
        pausedAt: !isPlaying ? Date.now() : null,
        jamRoomId: jamRoomId || null,
        isPlatformTrack: true,
        source: track.source || (track.id?.startsWith('sc-') ? 'soundcloud' : 'platform'),
      };

      await this.prisma.profileShowcase.update({
        where: { userId },
        data: { activityStatus: activityStatus as any },
      });

      this.handleShowcasePresenceUpdated({
        userId,
        activityStatus,
        connectedAccounts: showcase.connectedAccounts,
        isPrivate,
      });
    } catch (err) {
      this.logger.warn(`Failed to broadcast platform music activity: ${(err as Error).message}`);
    }
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
    return (client.handshake.auth?.token as string) ?? null;
  }
}
