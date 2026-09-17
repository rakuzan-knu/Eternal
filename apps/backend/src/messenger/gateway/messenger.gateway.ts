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
import {
  Logger,
  UseFilters,
  UseInterceptors,
  forwardRef,
  Inject,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Subject, Subscription } from 'rxjs';
import { bufferTime, filter, groupBy, mergeMap } from 'rxjs/operators';
import { WS_EVENTS } from '../events/ws-events';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { K8sPodMigrationService } from './k8s-pod-migration.service';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import { VisibilityResolver } from '../../users/privacy/visibility.resolver';
import { PrivacyDimension, Prisma } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import { WsValidationFilter } from '../filters/ws-validation.filter';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { safeJsonParse } from '../../common/utils/json.util';
import { z } from 'zod';
import { JamService, type JamTrack } from '../../integrations/jam.service';
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
  type MessageDeliveredDto,
  type ClientHibernateDto,
  conversationIdSchema,
  deleteMessageSchema,
  editMessageSchema,
  forwardMessageSchema,
  gatewayResumeSchema,
  getOnlineStatusSchema,
  markReadSchema,
  messageDeliveredSchema,
  clientHibernateSchema,
  reactToMessageSchema,
  sendMessageSchema,
  togglePinMessageSchema,
  type InitiateCallDto,
  type AcceptCallDto,
  type RejectCallDto,
  type EndCallDto,
  type IceCandidateDto,
  type MuteToggleDto,
  type VideoToggleDto,
  type ScreenShareDto,
  type CallReconnectDto,
  type IceRestartDto,
  type IceRestartAnswerDto,
  initiateCallSchema,
  acceptCallSchema,
  rejectCallSchema,
  endCallSchema,
  iceCandidateSchema,
  muteToggleSchema,
  videoToggleSchema,
  screenShareSchema,
  callReconnectSchema,
  iceRestartSchema,
  iceRestartAnswerSchema,
  relayAnnounceSchema,
  relayRequestSchema,
  type RelayAnnounceDto,
  type RelayRequestDto,
  callHandoffRequestSchema,
  type CallHandoffRequestDto,
} from '@common/contracts';
import { CallsService } from '../calls/calls.service';

import { QueueService } from '../../queue/queue.service';
import { MessageJobType, SearchJobType } from '../../queue/queue.constants';
import { TraceContext } from '../../common/tracing/trace-context';
import { WsTraceInterceptor } from '../../common/tracing/ws-trace.interceptor';
import { randomUUID } from 'node:crypto';
import { MetricsService } from '../../metrics/metrics.service';
import { PresenceEngineService } from '../presence/presence-engine.service';
import { WsDrainingService, type DrainOptions } from './ws-draining.service';
import { WsBackpressureService, type EventPriority } from './ws-backpressure.service';
import { readReceiptPool } from './ws-event-pools';
import { buildWsFrameString } from '../../common/v8/zero-alloc-parser';
import { makeWsEvent } from '../../common/v8/shape-stable';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  traceId?: string | undefined;
  isHibernated?: boolean | undefined;
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
@UseInterceptors(WsTraceInterceptor)
@WebSocketGateway({
  namespace: '/messenger',
  cors: {
    origin: getCorsOrigin(),
    credentials: true,
  },
  pingInterval: 10_000,
  pingTimeout: 5_000,
  maxHttpBufferSize: 1_000_000,
})
export class MessengerGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  @WebSocketServer()
  private readonly server!: Server;

  private readonly logger = new Logger(MessengerGateway.name);
  private readonly onlineUsers = new Map<string, Set<string>>();
  private readonly socketTimers = new Map<string, Set<NodeJS.Timeout>>();
  private readonly hostSyncRateMap = new Map<string, number[]>();

  private readonly RATE_LIMIT = 20;
  private readonly RATE_WINDOW_MS = 10_000;

  private readonly candidateSubject$ = new Subject<{
    callId: string;
    candidate: unknown;
    senderUserId: string;
    targetUserId?: string | undefined;
  }>();
  private candidateSub?: Subscription;

  onModuleInit(): void {
    this.logger.log('MessengerGateway initialized');
    this.initRxCandidateBackpressure();
  }

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
    private readonly queueService?: QueueService,
    @Optional()
    private readonly metricsService?: MetricsService,
    @Optional()
    private readonly presenceEngine?: PresenceEngineService,
    @Optional()
    private readonly drainingService?: WsDrainingService,
    @Optional()
    private readonly backpressureService?: WsBackpressureService,
    @Optional()
    @Inject(forwardRef(() => CallsService))
    private readonly callsService?: CallsService,
    @Optional()
    private readonly podMigrationService?: K8sPodMigrationService,
    @Optional()
    private readonly prisma?: PrismaService,
    @Optional()
    private readonly jamService?: JamService,
  ) {}

  afterInit() {
    if (this.presenceEngine && this.server) {
      this.presenceEngine.setServer(this.server);
    }
    this.logger.log(`Messenger WebSocket Gateway initialised.`);
  }

  registerSocketTimer(socketId: string, timer: NodeJS.Timeout): NodeJS.Timeout {
    if (!this.socketTimers.has(socketId)) {
      this.socketTimers.set(socketId, new Set());
    }
    this.socketTimers.get(socketId)!.add(timer);
    return timer;
  }

  clearSocketTimers(socketId: string): void {
    const timers = this.socketTimers.get(socketId);
    if (timers) {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      this.socketTimers.delete(socketId);
    }
  }

  onModuleDestroy(): void {
    for (const [socketId] of this.socketTimers) {
      this.clearSocketTimers(socketId);
    }
    this.socketTimers.clear();
    this.onlineUsers.clear();
    this.candidateSub?.unsubscribe();
    try {
      this.server?.disconnectSockets?.(true);
    } catch {
      // ignore on teardown
    }
  }

  async drainSockets(options?: DrainOptions): Promise<void> {
    if (this.podMigrationService) {
      await this.podMigrationService.migrateRoomsOnShutdown(this.server);
    }
    if (this.drainingService) {
      await this.drainingService.drainSockets(this.server, options);
    } else {
      this.server?.disconnectSockets?.(true);
    }
  }

  async handleConnection(client: Socket): Promise<void> {
    if (this.drainingService?.isDraining) {
      client.emit(WS_EVENTS.RECONNECT_WITH_BACKOFF, {
        reconnectAfterMs: Math.floor(Math.random() * 5000) + 1000,
        reason: 'server_shutdown',
      });
      client.disconnect(true);
      return;
    }

    const rawTraceId =
      client.handshake.headers['x-trace-id'] ||
      client.handshake.headers['x-correlation-id'] ||
      (client.handshake.auth?.traceId as string | undefined);
    const traceId = (Array.isArray(rawTraceId) ? rawTraceId[0] : rawTraceId) || randomUUID();
    (client as AuthenticatedSocket).traceId = traceId;

    await TraceContext.run(
      {
        traceId,
        correlationId: traceId,
        reqMethod: 'WS_CONNECT',
        reqUrl: '/messenger',
      },
      async () => {
        try {
          const token = this.extractToken(client);
          if (!token) throw new WsException('Missing auth token');

          const payload = await this.jwtService.verifyAsync<{ sub: string; type: string }>(token, {
            secret: this.configService.get<string>('JWT_ACCESS_SECRET') || '',
          });

          if (payload.type !== 'access') throw new WsException('Invalid token type');

          const userId = payload.sub;
          (client as AuthenticatedSocket).userId = userId;
          TraceContext.setUserId(userId);

          // Join user room for cross-instance Pub/Sub broadcasting via Redis Adapter
          await client.join(`user:${userId}`);

          const wasOffline = this.presenceEngine
            ? this.presenceEngine.recordUserOnline(userId, client.id)
            : !this.onlineUsers.has(userId);

          if (!this.onlineUsers.has(userId)) this.onlineUsers.set(userId, new Set());
          this.onlineUsers.get(userId)!.add(client.id);

          // Track in Redis Socket Set for Multi-Tab Presence
          await this.redisService.sadd(`user:sockets:${userId}`, client.id).catch(() => {});
          await this.redisService.expire(`user:sockets:${userId}`, 86400).catch(() => {});
          await this.redisService.set(`user:presence:${userId}`, 'online', 60).catch(() => {});

          if (wasOffline && !this.presenceEngine) {
            await this.emitPresenceExceptBlocked(userId, WS_EVENTS.USER_ONLINE, { userId });
          }

          const seqRaw = await this.redisService.get(`user:seq:${userId}`).catch(() => '0');
          const currentSeq = Number(seqRaw || '0') | 0;
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

          this.metricsService?.incrementActiveConnections();
          this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
        } catch (err) {
          this.logger.warn(`Rejected connection: ${(err as Error).message}`);
          client.disconnect(true);
        }
      },
    );
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.hostSyncRateMap.delete(client.id);
    const traceId = (client as AuthenticatedSocket).traceId || randomUUID();
    const userId = (client as AuthenticatedSocket).userId;

    await TraceContext.run(
      {
        traceId,
        correlationId: traceId,
        userId,
        reqMethod: 'WS_DISCONNECT',
        reqUrl: '/messenger',
      },
      async () => {
        this.clearSocketTimers(client.id);
        this.backpressureService?.cleanupSocket(client.id);
        try {
          client.removeAllListeners();
        } catch {
          // ignore
        }

        if (!userId) return;

        const userSockets = this.onlineUsers.get(userId);
        if (userSockets) {
          userSockets.delete(client.id);
          if (userSockets.size === 0) {
            this.onlineUsers.delete(userId);
          }
        }

        if (this.presenceEngine) {
          this.presenceEngine.recordUserOffline(userId, client.id);
        }

        await this.redisService.srem(`user:sockets:${userId}`, client.id).catch(() => {});
        const remainingSockets = await this.redisService
          .scard(`user:sockets:${userId}`)
          .catch(() => 0);

        // Only switch to offline if all tabs / sockets are closed
        if ((!userSockets || userSockets.size === 0) && remainingSockets === 0) {
          this.onlineUsers.delete(userId);
          await this.redisService.del(`user:presence:${userId}`).catch(() => {});
          void this.usersService.touchLastSeen(userId).catch(() => {});
          if (!this.presenceEngine) {
            void this.emitPresenceExceptBlocked(userId, WS_EVENTS.USER_OFFLINE, { userId });
          }

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
        this.metricsService?.decrementActiveConnections();
        this.logger.log(`Client disconnected: ${client.id}`);
      },
    );
  }

  @SubscribeMessage(WS_EVENTS.GET_ONLINE_STATUS)
  async handleGetOnlineStatus(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(getOnlineStatusSchema)) payload: GetOnlineStatusDto,
    callback?: (res: {
      status: string;
      online?: string[];
      activities?: Record<string, unknown>;
      error?: string;
    }) => void,
  ): Promise<void> {
    try {
      let onlineSubjects: string[] = [];
      if (this.presenceEngine) {
        onlineSubjects = await this.presenceEngine.getOnlineUserIds(payload.userIds);
      } else {
        onlineSubjects = payload.userIds.filter(
          (userId) => this.onlineUsers.has(userId) || (client.userId && userId === client.userId),
        );
      }

      if (onlineSubjects.length === 0) {
        callback?.({ status: 'ok', online: [], activities: {} });
        return;
      }

      // Resolve each subject's LAST_SEEN visibility toward this viewer (block + privacy + exceptions).
      const ctx = await this.visibility.loadContext(onlineSubjects, client.userId);
      const online = onlineSubjects.filter((userId) =>
        this.visibility.resolve(PrivacyDimension.LAST_SEEN, userId, ctx),
      );

      const activities: Record<string, unknown> = {};
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
          this.logger.warn(`Failed to fetch activities in handleGetOnlineStatus: ${String(err)}`);
        }
      }

      callback?.({ status: 'ok', online, activities });
    } catch (e) {
      this.logger.warn(`Failed to resolve online status for user ${client.userId}: ${String(e)}`);
      callback?.({ status: 'ok', online: [], activities: {} });
    }
  }

  @SubscribeMessage(WS_EVENTS.JOIN_CONVERSATION)
  async handleJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(conversationIdSchema)) payload: ConversationIdDto,
  ) {
    await this.convsService.assertMember(payload.conversationId, client.userId);
    await client.join(payload.conversationId);
  }

  @SubscribeMessage(WS_EVENTS.LEAVE_CONVERSATION)
  async handleLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(conversationIdSchema)) payload: ConversationIdDto,
  ) {
    await client.leave(payload.conversationId);
  }

  @SubscribeMessage(WS_EVENTS.TYPING_START)
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(conversationIdSchema)) payload: ConversationIdDto,
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
      { includeActor: false, priority: 'ephemeral' },
    );
  }

  @SubscribeMessage(WS_EVENTS.HEARTBEAT)
  async handleHeartbeat(@ConnectedSocket() client: AuthenticatedSocket): Promise<void> {
    const userId = client.userId;
    if (!userId) return;
    if (this.presenceEngine) {
      this.presenceEngine.recordHeartbeat(userId);
    } else {
      await this.redisService.set(`user:presence:${userId}`, 'online', 45);
    }
  }

  @SubscribeMessage(WS_EVENTS.TYPING_STOP)
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(conversationIdSchema)) payload: ConversationIdDto,
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
      { includeActor: false, priority: 'ephemeral' },
    );
  }

  @SubscribeMessage(WS_EVENTS.MARK_READ)
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(markReadSchema)) payload: MarkReadDto,
  ) {
    const isUpdated = await this.messagesService.markRead(
      payload.conversationId,
      client.userId,
      payload.messageId,
    );

    if (!isUpdated) return;

    const event = readReceiptPool.acquire();
    event.conversationId = payload.conversationId;
    event.userId = client.userId;
    event.messageId = payload.messageId || null;
    event.readAt = new Date().toISOString();

    try {
      await this.emitToConversationExceptBlocked(
        payload.conversationId,
        client.userId,
        WS_EVENTS.MESSAGE_READ,
        event,
        { includeActor: false },
      );
    } finally {
      readReceiptPool.release(event);
    }
  }

  @SubscribeMessage(WS_EVENTS.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(sendMessageSchema)) payload: SendMessageDto,
    callback?: (res: {
      status: string;
      message?: unknown;
      error?: string | undefined;
      clientMessageId?: string | undefined;
      clientSeq?: number | undefined;
    }) => void,
  ): Promise<void> {
    const isLimited = await this.isRateLimited(client.userId).catch(() => false);
    if (isLimited) {
      const rateLimitError = 'Too many messages, slow down';
      client.emit(WS_EVENTS.RATE_LIMIT_EXCEEDED, { message: rateLimitError });
      callback?.({ status: 'error', error: rateLimitError });
      return;
    }

    if (!payload.conversationId) {
      callback?.({ status: 'error', error: 'conversationId is required' });
      return;
    }

    await this.convsService.assertMember(payload.conversationId, client.userId);

    const message = await this.messagesService.send(payload.conversationId, client.userId, payload);

    if (payload.clientSeq != null) {
      await this.redisService
        .set(
          `user:conv:last_client_seq:${client.userId}:${payload.conversationId}`,
          String(payload.clientSeq),
          86400,
        )
        .catch(() => {});
    }

    await this.convsService.touchUpdatedAt(payload.conversationId);
    await this.emitToConversationExceptBlocked(
      payload.conversationId,
      client.userId,
      WS_EVENTS.NEW_MESSAGE,
      {
        conversationId: payload.conversationId,
        message,
        clientMessageId: payload.clientMessageId,
        clientSeq: payload.clientSeq,
      },
    );

    if (this.queueService) {
      void this.queueService
        .addMessageJob(MessageJobType.FANOUT, {
          conversationId: payload.conversationId,
          senderId: client.userId,
          messageId: (message as { id?: string })?.id,
          snippet: payload.text ? payload.text.slice(0, 100) : '',
        })
        .catch(() => {});

      const hashtags = payload.text ? payload.text.match(/#[a-zA-Z0-9_]+/g) : null;
      if (hashtags && hashtags.length > 0) {
        void this.queueService
          .addSearchIndexingJob(SearchJobType.INDEX_HASHTAG, {
            id: (message as { id?: string })?.id || 'msg',
            type: 'hashtag',
            tags: hashtags,
          })
          .catch(() => {});
      }
    }

    callback?.({
      status: 'ok',
      message,
      clientMessageId: payload.clientMessageId,
      clientSeq: payload.clientSeq,
    });
  }

  @SubscribeMessage(WS_EVENTS.GATEWAY_RESUME)
  async handleGatewayResume(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(gatewayResumeSchema)) payload: GatewayResumeDto,
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
          return safeJsonParse<Record<string, unknown>>(str);
        })
        .filter(Boolean);

      client.emit(WS_EVENTS.GATEWAY_RESUMED, { currentSeq, count: events.length });
      callback?.({ status: 'ok', events, currentSeq });
    } catch (err) {
      this.logger.warn(`Gateway resume failed for client ${client.id}: ${String(err)}`);
      client.emit(WS_EVENTS.RESYNC_REQUIRED, { reason: 'resume_error' });
      callback?.({ status: 'resync_required' });
    }
  }

  @SubscribeMessage(WS_EVENTS.MESSAGE_DELIVERED)
  async handleMessageDelivered(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(messageDeliveredSchema)) payload: MessageDeliveredDto,
    callback?: (res: { status: string }) => void,
  ): Promise<void> {
    const userId = client.userId;
    if (!userId) return;

    try {
      await this.convsService.assertMember(payload.conversationId, userId);

      // Broadcast delivery receipt to conversation participants except receiver
      this.server.to(`conversation:${payload.conversationId}`).emit(WS_EVENTS.MESSAGE_DELIVERED, {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        deliveredToUserId: userId,
        deliveredAt: new Date().toISOString(),
      });

      callback?.({ status: 'ok' });
    } catch (err) {
      this.logger.warn(`handleMessageDelivered error: ${String(err)}`);
      callback?.({ status: 'error' });
    }
  }

  @SubscribeMessage(WS_EVENTS.CLIENT_HIBERNATE)
  async handleClientHibernate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(clientHibernateSchema)) _payload: ClientHibernateDto,
    callback?: (res: { status: string }) => void,
  ): Promise<void> {
    const userId = client.userId;
    if (userId) {
      if (client.isHibernated) {
        callback?.({ status: 'ok' });
        return;
      }
      client.isHibernated = true;
      // Mark connection as hibernated in background - maintains session without high-frequency heartbeats
      await this.redisService
        .set(`user:hibernated:${userId}:${client.id}`, '1', 300)
        .catch(() => {});
      this.logger.debug?.(`Client ${client.id} (user: ${userId}) hibernated in background.`);
    }
    callback?.({ status: 'ok' });
  }

  @SubscribeMessage(WS_EVENTS.CLIENT_WAKE)
  async handleClientWake(
    @ConnectedSocket() client: AuthenticatedSocket,
    callback?: (res: { status: string; currentSeq?: number }) => void,
  ): Promise<void> {
    const userId = client.userId;
    if (userId) {
      client.isHibernated = false;
      await this.redisService.del(`user:hibernated:${userId}:${client.id}`).catch(() => {});
      await this.redisService.set(`user:presence:${userId}`, 'online', 60).catch(() => {});
      const seqRaw = await this.redisService.get(`user:seq:${userId}`).catch(() => '0');
      const currentSeq = Number(seqRaw || '0');
      callback?.({ status: 'ok', currentSeq });
      return;
    }
    callback?.({ status: 'ok' });
  }

  @SubscribeMessage(WS_EVENTS.EDIT_MESSAGE)
  async handleEditMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(editMessageSchema)) payload: EditMessageDto,
    callback?: (res: { status: string; message?: unknown; error?: string }) => void,
  ): Promise<void> {
    if (!payload.messageId) {
      callback?.({ status: 'error', error: 'messageId is required' });
      return;
    }
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
    @MessageBody(new ZodValidationPipe(deleteMessageSchema)) payload: DeleteMessageDto,
    callback?: (res: { status: string; deletedForAll: boolean; error?: string }) => void,
  ): Promise<void> {
    if (!payload.messageId) {
      callback?.({ status: 'error', error: 'messageId is required', deletedForAll: false });
      return;
    }
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
    @MessageBody(new ZodValidationPipe(forwardMessageSchema)) payload: ForwardMessageDto,
    callback?: (res: { status: string; messages?: unknown[]; error?: string }) => void,
  ): Promise<void> {
    if (!payload.messageId) {
      callback?.({ status: 'error', error: 'messageId is required' });
      return;
    }
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
    @MessageBody(new ZodValidationPipe(reactToMessageSchema)) payload: ReactToMessageDto,
    callback?: (res: { status: string; message?: unknown; error?: string }) => void,
  ): Promise<void> {
    if (!payload.messageId) {
      callback?.({ status: 'error', error: 'messageId is required' });
      return;
    }
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
    @MessageBody(new ZodValidationPipe(reactToMessageSchema)) payload: ReactToMessageDto,
    callback?: (res: { status: string; message?: unknown; error?: string }) => void,
  ): Promise<void> {
    if (!payload.messageId) {
      callback?.({ status: 'error', error: 'messageId is required' });
      return;
    }
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
    @MessageBody(new ZodValidationPipe(togglePinMessageSchema)) payload: TogglePinMessageDto,
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
    @MessageBody(new ZodValidationPipe(togglePinMessageSchema)) payload: TogglePinMessageDto,
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
    opts: { includeActor?: boolean; priority?: EventPriority } = {},
  ): Promise<void> {
    const includeActor = opts.includeActor ?? true;
    const priority = opts.priority ?? 'critical';

    const [participantIds, { blockedByMe, blockingMe }] = await Promise.all([
      this.convsService.getParticipantIds(conversationId),
      this.convsService.getBlockRelationships(actingUserId),
    ]);

    for (const userId of participantIds) {
      if (userId === actingUserId) {
        if (includeActor) this.emitToUser(userId, event, payload, priority);
        continue;
      }
      if (blockedByMe.has(userId) || blockingMe.has(userId)) continue;
      this.emitToUser(userId, event, payload, priority);
    }
  }

  private getSocketInstance(socketId: string): Socket | undefined {
    const rawSockets = (
      this.server as unknown as {
        sockets?: Map<string, Socket> | { sockets?: Map<string, Socket> };
      }
    )?.sockets;
    if (!rawSockets) return undefined;
    if (rawSockets instanceof Map) {
      return rawSockets.get(socketId);
    }
    if ('sockets' in rawSockets && rawSockets.sockets instanceof Map) {
      return rawSockets.sockets.get(socketId);
    }
    return (rawSockets as Record<string, Socket>)?.[socketId];
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
        const socket = this.getSocketInstance(socketId);
        if (socket) {
          if (this.backpressureService) {
            this.backpressureService.sendSafe(socket, event, payload, 'ephemeral');
          } else {
            socket.emit(event, payload);
          }
        }
      }
    }
  }

  emitToUser(
    userId: string,
    event: string,
    payload: unknown,
    priority: EventPriority = 'critical',
  ): void {
    void (async () => {
      try {
        const seq = (await this.redisService.incr(`user:seq:${userId}`)) | 0;
        await this.redisService.expire(`user:seq:${userId}`, 86400 * 30).catch(() => {});

        // Shape-stable wrapper — always same key order {seq, event, payload, timestamp}
        // V8 assigns one stable hidden-class for all emitToUser calls
        const wrapped = makeWsEvent(seq, event, payload, Date.now());
        const serialized = buildWsFrameString(wrapped);
        // Pool release no longer needed (makeWsEvent is allocation-per-call but
        // remains monomorphic — GC collects this, no fragmentation from mixed shapes)
        // For zero-allocation budget: the pool is still used for typing/read-receipts
        // which are the true high-frequency paths (100+ calls/sec)

        const bufferKey = `user:events:${userId}`;
        await this.redisService.zadd(bufferKey, seq, serialized);
        await this.redisService.zremrangebyrank(bufferKey, 0, -500);
        await this.redisService.expire(bufferKey, 600);
      } catch (e) {
        this.logger.warn(`Redis event buffer error for user ${userId}: ${String(e)}`);
      }
    })();

    // Broadcast across all cluster instances to the user room
    this.server.to(`user:${userId}`).emit(event, payload);

    const socketIds = this.onlineUsers.get(userId);
    if (!socketIds) return;
    for (const socketId of socketIds) {
      const socket = this.getSocketInstance(socketId);
      if (socket && this.backpressureService) {
        this.backpressureService.sendSafe(socket, event, payload, priority);
      }
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
    if (participantUserIds.length > 100 && this.queueService) {
      void this.queueService.addGlobalEntityFanoutJob(
        conversationId,
        WS_EVENTS.CONVERSATION_DELETED,
        { conversationId },
      );
    } else {
      for (const userId of participantUserIds) {
        this.emitToUser(userId, WS_EVENTS.CONVERSATION_DELETED, { conversationId });
      }
    }
  }

  emitMessagesCleared(conversationId: string, participantUserIds: string[] = []) {
    this.server.to(conversationId).emit(WS_EVENTS.MESSAGES_CLEARED, { conversationId });
    if (participantUserIds.length > 100 && this.queueService) {
      void this.queueService.addGlobalEntityFanoutJob(conversationId, WS_EVENTS.MESSAGES_CLEARED, {
        conversationId,
      });
    } else {
      for (const userId of participantUserIds) {
        this.emitToUser(userId, WS_EVENTS.MESSAGES_CLEARED, { conversationId });
      }
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
    @MessageBody(
      new ZodValidationPipe(
        z.object({
          targetUserId: z.string().min(1).max(128),
        }),
      ),
    )
    data: { targetUserId: string },
  ) {
    if (data?.targetUserId) {
      void client.join(`showcase:${data.targetUserId}`);
    }
  }

  @SubscribeMessage('unsubscribeShowcase')
  handleUnsubscribeShowcase(
    @ConnectedSocket() client: Socket,
    @MessageBody(
      new ZodValidationPipe(
        z.object({
          targetUserId: z.string().min(1).max(128),
        }),
      ),
    )
    data: { targetUserId: string },
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
    @MessageBody(
      new ZodValidationPipe(
        z.object({
          storyId: z.string().min(1).max(128),
        }),
      ),
    )
    data: { storyId: string },
  ) {
    if (data?.storyId) {
      void client.join(`story:${data.storyId}`);
    }
  }

  @SubscribeMessage('unsubscribeStory')
  handleUnsubscribeStory(
    @ConnectedSocket() client: Socket,
    @MessageBody(
      new ZodValidationPipe(
        z.object({
          storyId: z.string().min(1).max(128),
        }),
      ),
    )
    data: { storyId: string },
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

  @SubscribeMessage('e2ee:key_exchange')
  handleE2eeKeyExchange(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      recipientId: string;
      ephemeralPublicKey: string;
      conversationId?: string;
    },
    callback?: (res: { status: string }) => void,
  ): void {
    const senderId = client.userId;
    if (!senderId || !payload?.recipientId || !payload?.ephemeralPublicKey) {
      callback?.({ status: 'error' });
      return;
    }

    this.server.to(`user:${payload.recipientId}`).emit('e2ee:key_exchange_received', {
      senderId,
      ephemeralPublicKey: payload.ephemeralPublicKey,
      conversationId: payload.conversationId,
      timestamp: new Date().toISOString(),
    });

    callback?.({ status: 'ok' });
  }

  @SubscribeMessage(WS_EVENTS.CALL_INITIATE)
  async handleCallInitiate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(initiateCallSchema)) payload: InitiateCallDto,
    callback?: (res: { status: string; callId?: string; call?: unknown; error?: string }) => void,
  ) {
    if (!this.callsService) throw new WsException('CallsService not available');
    try {
      const result = await this.callsService.initiateCall(
        client.userId,
        payload.conversationId,
        payload.callType,
        payload.sdpOffer,
        payload.iceCandidates,
        payload.zkpProof,
        payload.isGhostMode,
      );

      const callerInfo = payload.isGhostMode
        ? {
            id: client.userId,
            username: payload.zkpProof?.anonymousAlias || 'Anonymous Caller (ZK-Verified)',
            displayName: payload.zkpProof?.anonymousAlias || 'Anonymous Caller (ZK-Verified)',
            avatar: null,
            isOnline: true,
          }
        : result.call.initiator;

      const incomingPayload = {
        callId: result.call.id,
        callerId: client.userId,
        caller: callerInfo,
        conversationId: payload.conversationId,
        callType: payload.callType,
        sdpOffer: payload.sdpOffer,
        iceCandidates: payload.iceCandidates || [],
        zkpProof: payload.zkpProof || null,
        isGhostMode: Boolean(payload.isGhostMode),
        // E2EE handshake relay: opaque ephemeral key + identity signature,
        // conditional spread keeps legacy payloads byte-identical.
        ...(payload.e2eeEphemeralKey ? { e2eeEphemeralKey: payload.e2eeEphemeralKey } : {}),
        ...(payload.e2eeBindingSignature
          ? { e2eeBindingSignature: payload.e2eeBindingSignature }
          : {}),
      };

      for (const targetUserId of result.targetUserIds) {
        this.emitToUser(targetUserId, WS_EVENTS.CALL_INCOMING, incomingPayload);
      }

      void this.podMigrationService?.registerRoom(result.call.id);
      void this.podMigrationService?.recordSignal(
        result.call.id,
        WS_EVENTS.CALL_INITIATE,
        incomingPayload,
      );

      const response = {
        status: 'ok',
        callId: result.call.id,
        call: this.callsService.mapToView(result.call),
      };
      callback?.(response);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Call initiation failed';
      this.logger.error(`Error in call:initiate by ${client.userId}: ${message}`);
      const errResponse = { status: 'error', error: message };
      callback?.(errResponse);
      throw err;
    }
  }

  @SubscribeMessage(WS_EVENTS.CALL_ACCEPT)
  async handleCallAccept(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(acceptCallSchema)) payload: AcceptCallDto,
    callback?: (res: { status: string; call?: unknown; error?: string }) => void,
  ) {
    if (!this.callsService) throw new WsException('CallsService not available');
    try {
      const result = await this.callsService.acceptCall(
        client.userId,
        payload.callId,
        payload.sdpAnswer,
        payload.iceCandidates,
      );

      const acceptedPayload = {
        callId: payload.callId,
        accepterId: client.userId,
        sdpAnswer: payload.sdpAnswer,
        iceCandidates: payload.iceCandidates || [],
        ...(payload.e2eeEphemeralKey ? { e2eeEphemeralKey: payload.e2eeEphemeralKey } : {}),
        ...(payload.e2eeBindingSignature
          ? { e2eeBindingSignature: payload.e2eeBindingSignature }
          : {}),
      };

      this.emitToUser(result.initiatorId, WS_EVENTS.CALL_ACCEPTED, acceptedPayload);

      for (const p of result.call.participants) {
        if (p.userId !== client.userId && p.userId !== result.initiatorId) {
          this.emitToUser(p.userId, WS_EVENTS.CALL_PARTICIPANT_JOINED, {
            callId: payload.callId,
            userId: client.userId,
            joinedAt: new Date().toISOString(),
          });
        }
      }

      const response = {
        status: 'ok',
        call: this.callsService.mapToView(result.call),
      };
      callback?.(response);
      return response;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Call accept failed';
      this.logger.error(`Error in call:accept by ${client.userId}: ${message}`);
      const errResponse = { status: 'error', error: message };
      callback?.(errResponse);
      throw err;
    }
  }

  @SubscribeMessage(WS_EVENTS.CALL_REJECT)
  async handleCallReject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(rejectCallSchema)) payload: RejectCallDto,
    callback?: (res: { status: string }) => void,
  ) {
    if (!this.callsService) throw new WsException('CallsService not available');
    try {
      const result = await this.callsService.rejectCall(
        client.userId,
        payload.callId,
        payload.reason,
      );

      const endedPayload = {
        callId: payload.callId,
        reason: payload.reason || 'DECLINED',
        declinedBy: client.userId,
      };

      for (const targetUserId of result.targetUserIds) {
        this.emitToUser(targetUserId, WS_EVENTS.CALL_ENDED, endedPayload);
      }

      callback?.({ status: 'ok' });
      return { status: 'ok' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Call reject failed';
      this.logger.error(`Error in call:reject by ${client.userId}: ${message}`);
      callback?.({ status: 'error' });
      throw err;
    }
  }

  private initRxCandidateBackpressure(): void {
    this.candidateSub = this.candidateSubject$
      .pipe(
        groupBy((item) => `${item.callId}_${item.targetUserId || 'broadcast'}`),
        mergeMap((group$) =>
          group$.pipe(
            bufferTime(100),
            filter((batch) => batch.length > 0),
          ),
        ),
      )
      .subscribe((batch) => {
        void this.flushCandidateBatch(batch);
      });
  }

  private async flushCandidateBatch(
    batch: Array<{
      callId: string;
      candidate: unknown;
      senderUserId: string;
      targetUserId?: string | undefined;
    }>,
  ): Promise<void> {
    if (batch.length === 0) return;

    const first = batch[0];
    const callId = first.callId;

    // Cache batch in Redis to avoid losing candidates during bursts
    try {
      const redisClient = this.redisService.getClient();
      if (redisClient && typeof redisClient.rpush === 'function') {
        const rawItems = batch.map((item) => JSON.stringify(item));
        await redisClient.rpush(`calls:candidates:${callId}`, ...rawItems);
        await redisClient.expire(`calls:candidates:${callId}`, 300);
      }
    } catch {
      // Redis optional fallback
    }

    // Forward batched candidates
    for (const item of batch) {
      const candidatePayload = {
        callId: item.callId,
        candidate: item.candidate,
        senderUserId: item.senderUserId,
      };

      if (item.targetUserId) {
        this.emitToUser(item.targetUserId, WS_EVENTS.CALL_ICE_CANDIDATE, candidatePayload);
      } else {
        const call = await this.callsService
          ?.getCallById(item.callId, item.senderUserId)
          .catch(() => null);
        if (call) {
          for (const p of call.participants) {
            if (p.userId !== item.senderUserId) {
              this.emitToUser(p.userId, WS_EVENTS.CALL_ICE_CANDIDATE, candidatePayload);
            }
          }
        }
      }
    }
  }

  @SubscribeMessage(WS_EVENTS.CALL_ICE_CANDIDATE)
  handleCallIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(iceCandidateSchema)) payload: IceCandidateDto,
  ) {
    this.candidateSubject$.next({
      callId: payload.callId,
      candidate: payload.candidate,
      senderUserId: client.userId,
      targetUserId: payload.targetUserId,
    });
  }

  @SubscribeMessage(WS_EVENTS.CALL_END)
  async handleCallEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(endCallSchema)) payload: EndCallDto,
    callback?: (res: { status: string }) => void,
  ) {
    if (!this.callsService) throw new WsException('CallsService not available');
    try {
      const result = await this.callsService.endCall(
        client.userId,
        payload.callId,
        payload.reason,
        payload.durationMs,
      );

      const endedPayload = {
        callId: payload.callId,
        reason: payload.reason || 'ENDED_BY_USER',
        durationMs: result.durationMs,
        endedBy: client.userId,
      };

      for (const targetUserId of result.targetUserIds) {
        this.emitToUser(targetUserId, WS_EVENTS.CALL_ENDED, endedPayload);
      }

      void this.podMigrationService?.unregisterRoom(payload.callId);

      callback?.({ status: 'ok' });
      return { status: 'ok' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Call end failed';
      this.logger.error(`Error in call:end by ${client.userId}: ${message}`);
      callback?.({ status: 'error' });
      throw err;
    }
  }

  @SubscribeMessage(WS_EVENTS.CALL_MUTE)
  async handleCallMute(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(muteToggleSchema)) payload: MuteToggleDto,
  ) {
    if (!this.callsService) return;
    const call = await this.callsService.toggleMedia(
      client.userId,
      payload.callId,
      'mute',
      payload.isMuted,
    );
    for (const p of call.participants) {
      if (p.userId !== client.userId) {
        this.emitToUser(p.userId, payload.isMuted ? WS_EVENTS.CALL_MUTE : WS_EVENTS.CALL_UNMUTE, {
          callId: payload.callId,
          userId: client.userId,
          isMuted: payload.isMuted,
        });
      }
    }
  }

  @SubscribeMessage(WS_EVENTS.CALL_UNMUTE)
  async handleCallUnmute(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(muteToggleSchema)) payload: MuteToggleDto,
  ) {
    return this.handleCallMute(client, { ...payload, isMuted: false });
  }

  @SubscribeMessage(WS_EVENTS.CALL_VIDEO_TOGGLE)
  async handleCallVideoToggle(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(videoToggleSchema)) payload: VideoToggleDto,
  ) {
    if (!this.callsService) return;
    const call = await this.callsService.toggleMedia(
      client.userId,
      payload.callId,
      'video',
      payload.isVideoOff,
    );
    for (const p of call.participants) {
      if (p.userId !== client.userId) {
        this.emitToUser(p.userId, WS_EVENTS.CALL_VIDEO_TOGGLE, {
          callId: payload.callId,
          userId: client.userId,
          isVideoOff: payload.isVideoOff,
        });
      }
    }
  }

  @SubscribeMessage(WS_EVENTS.CALL_SCREEN_SHARE_START)
  async handleCallScreenShareStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(screenShareSchema)) payload: ScreenShareDto,
  ) {
    if (!this.callsService) return;
    const call = await this.callsService.toggleMedia(
      client.userId,
      payload.callId,
      'screenShare',
      true,
    );
    for (const p of call.participants) {
      if (p.userId !== client.userId) {
        this.emitToUser(p.userId, WS_EVENTS.CALL_SCREEN_SHARE_START, {
          callId: payload.callId,
          userId: client.userId,
        });
      }
    }
  }

  @SubscribeMessage(WS_EVENTS.CALL_SCREEN_SHARE_STOP)
  async handleCallScreenShareStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(screenShareSchema)) payload: ScreenShareDto,
  ) {
    if (!this.callsService) return;
    const call = await this.callsService.toggleMedia(
      client.userId,
      payload.callId,
      'screenShare',
      false,
    );
    for (const p of call.participants) {
      if (p.userId !== client.userId) {
        this.emitToUser(p.userId, WS_EVENTS.CALL_SCREEN_SHARE_STOP, {
          callId: payload.callId,
          userId: client.userId,
        });
      }
    }
  }

  @SubscribeMessage(WS_EVENTS.CALL_RECONNECT)
  async handleCallReconnect(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(callReconnectSchema)) payload: CallReconnectDto,
  ) {
    if (!this.callsService) return;
    const call = await this.callsService
      .getCallById(payload.callId, client.userId)
      .catch(() => null);
    if (!call) return;
    for (const p of call.participants) {
      if (p.userId !== client.userId) {
        this.emitToUser(p.userId, WS_EVENTS.CALL_RECONNECT, {
          callId: payload.callId,
          userId: client.userId,
        });
      }
    }
  }

  @SubscribeMessage(WS_EVENTS.CALL_ICE_RESTART)
  async handleCallIceRestart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(iceRestartSchema)) payload: IceRestartDto,
    callback?: (res: { status: string }) => void,
  ) {
    const restartPayload = {
      callId: payload.callId,
      senderUserId: client.userId,
      sdpOffer: payload.sdpOffer,
    };
    if (payload.targetUserId) {
      this.emitToUser(payload.targetUserId, WS_EVENTS.CALL_ICE_RESTART, restartPayload);
    } else {
      const call = await this.callsService
        ?.getCallById(payload.callId, client.userId)
        .catch(() => null);
      if (call) {
        for (const p of call.participants) {
          if (p.userId !== client.userId) {
            this.emitToUser(p.userId, WS_EVENTS.CALL_ICE_RESTART, restartPayload);
          }
        }
      }
    }
    callback?.({ status: 'ok' });
    return { status: 'ok' };
  }

  @SubscribeMessage(WS_EVENTS.CALL_ICE_RESTART_ANSWER)
  async handleCallIceRestartAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(iceRestartAnswerSchema)) payload: IceRestartAnswerDto,
    callback?: (res: { status: string }) => void,
  ) {
    const answerPayload = {
      callId: payload.callId,
      senderUserId: client.userId,
      sdpAnswer: payload.sdpAnswer,
    };
    if (payload.targetUserId) {
      this.emitToUser(payload.targetUserId, WS_EVENTS.CALL_ICE_RESTART_ANSWER, answerPayload);
    } else {
      const call = await this.callsService
        ?.getCallById(payload.callId, client.userId)
        .catch(() => null);
      if (call) {
        for (const p of call.participants) {
          if (p.userId !== client.userId) {
            this.emitToUser(p.userId, WS_EVENTS.CALL_ICE_RESTART_ANSWER, answerPayload);
          }
        }
      }
    }
    callback?.({ status: 'ok' });
    return { status: 'ok' };
  }

  @SubscribeMessage(WS_EVENTS.CALL_RELAY_ANNOUNCE)
  async handleCallRelayAnnounce(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(relayAnnounceSchema)) payload: RelayAnnounceDto,
    callback?: (res: { status: string }) => void,
  ) {
    if (this.callsService) {
      await this.callsService.registerRelayNode(client.userId, payload.natType, payload.maxSlots);
    }
    callback?.({ status: 'ok' });
    return { status: 'ok' };
  }

  @SubscribeMessage(WS_EVENTS.CALL_RELAY_REQUEST)
  async handleCallRelayRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(relayRequestSchema)) payload: RelayRequestDto,
    callback?: (res: { status: string; relay?: unknown; error?: string }) => void,
  ) {
    if (!this.callsService) throw new WsException('CallsService not available');
    const allocation = await this.callsService.allocateRelayNode(
      payload.callId,
      client.userId,
      payload.targetUserId,
    );
    if (!allocation) {
      callback?.({ status: 'error', error: 'No relay peer available' });
      return { status: 'error', error: 'No relay peer available' };
    }

    const assignedPayload = {
      callId: payload.callId,
      relaySessionId: allocation.relaySessionId,
      relayUserId: allocation.relayUserId,
      callerId: client.userId,
      calleeId: payload.targetUserId,
    };

    // Notify caller, callee, and the relay node
    this.emitToUser(client.userId, WS_EVENTS.CALL_RELAY_ASSIGNED, {
      ...assignedPayload,
      isInitiator: true,
    });
    this.emitToUser(payload.targetUserId, WS_EVENTS.CALL_RELAY_ASSIGNED, {
      ...assignedPayload,
      isInitiator: false,
    });
    this.emitToUser(allocation.relayUserId, WS_EVENTS.CALL_RELAY_ASSIGNED, {
      ...assignedPayload,
      isRelayNode: true,
    });

    callback?.({ status: 'ok', relay: assignedPayload });
    return { status: 'ok', relay: assignedPayload };
  }

  @SubscribeMessage(WS_EVENTS.CALL_HANDOFF_REQUEST)
  async handleCallHandoffRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody(new ZodValidationPipe(callHandoffRequestSchema)) payload: CallHandoffRequestDto,
    callback?: (res: { status: string; call?: unknown; error?: string }) => void,
  ) {
    if (!this.callsService) throw new WsException('CallsService not available');
    try {
      const call = await this.callsService.getCallById(payload.callId, client.userId);
      if (call.status !== 'CONNECTED' && call.status !== 'RINGING' && call.status !== 'INITIATED') {
        callback?.({ status: 'error', error: 'Call is no longer active' });
        return { status: 'error', error: 'Call is no longer active' };
      }

      // Notify this new client with PREPARE event
      client.emit(WS_EVENTS.CALL_HANDOFF_PREPARE, {
        callId: payload.callId,
        conversationId: call.conversationId,
        call,
      });

      // Instruct other device(s) of this user to gracefully hand off and release media
      const userSockets = this.onlineUsers.get(client.userId);
      if (userSockets) {
        for (const socketId of userSockets) {
          if (socketId !== client.id) {
            this.server?.to(socketId).emit(WS_EVENTS.CALL_HANDOFF_COMPLETE, {
              callId: payload.callId,
              newSocketId: client.id,
              reason: 'HANDED_OFF_TO_ANOTHER_DEVICE',
            });
          }
        }
      }

      callback?.({ status: 'ok', call });
      return { status: 'ok', call };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Handoff failed';
      this.logger.error(`Error in call:handoff-request by ${client.userId}: ${message}`);
      callback?.({ status: 'error', error: message });
      return { status: 'error', error: message };
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
    @MessageBody()
    payload: { initialTrack?: JamTrack | null; queuePolicy?: 'dj_only' | 'open_queue' },
  ) {
    const userId = client.userId;
    if (!userId || !this.jamService) return;

    this.jamService.cancelDisconnectGrace(`jam_${userId}`);
    const user = await this.usersService.findById(userId).catch(() => null);
    const hostProfile: { username: string; avatar?: string } = {
      username: user?.username || 'User',
      ...(user?.avatar ? { avatar: user.avatar } : {}),
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
    const listenerProfile: { username: string; avatar?: string } = {
      username: user?.username || 'User',
      ...(user?.avatar ? { avatar: user.avatar } : {}),
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

    // eslint-disable-next-line no-sync
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
    @MessageBody() payload: { roomId: string; track: JamTrack },
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
      track: JamTrack | null;
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
    track: JamTrack | null,
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

      if (this.prisma) {
        await this.prisma.profileShowcase.update({
          where: { userId },
          data: { activityStatus: activityStatus },
        });
      }

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

  @SubscribeMessage(WS_EVENTS.VOICE_MESH_JOIN)
  async handleVoiceMeshJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    if (!payload?.roomId || !client.userId) return { success: false, existingPeers: [] };
    const roomKey = `voice-mesh:${payload.roomId}`;
    await client.join(roomKey);

    const roomSockets = await this.server.in(roomKey).fetchSockets();
    const existingPeers = roomSockets
      .map((s) => (s as unknown as AuthenticatedSocket).userId)
      .filter((uid) => uid && uid !== client.userId);

    const uniquePeers = Array.from(new Set(existingPeers));

    client.to(roomKey).emit(WS_EVENTS.VOICE_MESH_PEER_JOINED, {
      roomId: payload.roomId,
      peerId: client.userId,
    });

    return {
      success: true,
      existingPeers: uniquePeers,
    };
  }

  @SubscribeMessage(WS_EVENTS.VOICE_MESH_LEAVE)
  async handleVoiceMeshLeave(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    if (!payload?.roomId || !client.userId) return { success: false };
    const roomKey = `voice-mesh:${payload.roomId}`;
    await client.leave(roomKey);

    this.server.to(roomKey).emit(WS_EVENTS.VOICE_MESH_PEER_LEFT, {
      roomId: payload.roomId,
      peerId: client.userId,
    });
    return { success: true };
  }

  @SubscribeMessage(WS_EVENTS.VOICE_MESH_SIGNAL)
  handleVoiceMeshSignal(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      roomId: string;
      targetPeerId: string;
      signal: unknown;
    },
  ) {
    if (!payload?.roomId || !payload.targetPeerId || !payload.signal || !client.userId) {
      return { success: false };
    }

    this.emitToUser(payload.targetPeerId, WS_EVENTS.VOICE_MESH_SIGNAL, {
      roomId: payload.roomId,
      senderPeerId: client.userId,
      signal: payload.signal,
    });

    return { success: true };
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);
    return (client.handshake.auth?.token as string) ?? null;
  }
}
