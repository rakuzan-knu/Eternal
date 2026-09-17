import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { WS_EVENTS } from '../events/ws-events';
import type { Server } from 'socket.io';

export interface PresenceBatchPayload {
  online: string[];
  offline: string[];
  timestamp: number;
}

export type VisibilityFilterFn = (
  subjectUserIds: string[],
  viewerUserId: string,
) => Promise<string[]>;

/**
 * Presence & Online Status Engine:
 *
 * 1. Backpressure & Heartbeat Aggregation:
 *    - Ingests high-frequency heartbeats in-memory with zero per-packet Redis/SQL I/O.
 *    - Periodically flushes buffered heartbeats into Redis Sorted Set (`presence:online_zset`) with sliding score timestamps.
 * 2. Sliding Expiration:
 *    - Automatically purges expired presence records using `ZREMRANGEBYSCORE`.
 * 3. Traffic Compression & Server-Side Batching:
 *    - Aggregates online/offline state transitions and broadcasts compressed batch updates every 2.5–3 seconds.
 * 4. High-Performance Zero-SQL Status Resolution:
 *    - Evaluates multi-user online status directly from Redis ZSET and in-memory hot cache.
 */
@Injectable()
export class PresenceEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PresenceEngineService.name);

  public static readonly PRESENCE_ZSET_KEY = 'presence:online_zset';
  public static readonly OFFLINE_THRESHOLD_MS = 60_000; // 60 seconds sliding expiration
  public static readonly HEARTBEAT_FLUSH_INTERVAL_MS = 1_500; // 1.5s aggregation flush
  public static readonly BATCH_BROADCAST_INTERVAL_MS = 2_500; // 2.5s batch compression

  // In-memory Backpressure Heartbeat Aggregation Buffer
  private readonly heartbeatBuffer = new Set<string>();

  // In-memory multi-device socket tracking: userId -> Set<socketId>
  private readonly localSockets = new Map<string, Set<string>>();

  // Pending status transitions for batching
  private readonly pendingTransitions = new Map<string, 'online' | 'offline'>();

  private heartbeatTimer: NodeJS.Timeout | null = null;
  private batchBroadcastTimer: NodeJS.Timeout | null = null;
  private server: Server | null = null;
  private visibilityFilter: VisibilityFilterFn | null = null;

  constructor(private readonly redisService: RedisService) {
    this.startTimers();
  }

  onModuleInit(): void {
    this.logger.log('PresenceEngineService initialized');
  }

  onModuleDestroy(): void {
    this.stopTimers();
    this.heartbeatBuffer.clear();
    this.localSockets.clear();
    this.pendingTransitions.clear();
  }

  /**
   * Attaches Socket.IO server reference for broadcasting compressed presence batches.
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Configures optional visibility / privacy resolver for presence broadcasting.
   */
  setVisibilityFilter(filter: VisibilityFilterFn): void {
    this.visibilityFilter = filter;
  }

  private startTimers(): void {
    this.heartbeatTimer = setInterval(() => {
      void this.flushHeartbeats();
    }, PresenceEngineService.HEARTBEAT_FLUSH_INTERVAL_MS);

    if (typeof this.heartbeatTimer.unref === 'function') {
      this.heartbeatTimer.unref();
    }

    this.batchBroadcastTimer = setInterval(() => {
      this.flushPresenceBatch();
    }, PresenceEngineService.BATCH_BROADCAST_INTERVAL_MS);

    if (typeof this.batchBroadcastTimer.unref === 'function') {
      this.batchBroadcastTimer.unref();
    }
  }

  private stopTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.batchBroadcastTimer) {
      clearInterval(this.batchBroadcastTimer);
      this.batchBroadcastTimer = null;
    }
  }

  /**
   * Non-blocking O(1) Heartbeat Ingestion: buffers user ID in-memory.
   * Zero Redis or SQL calls executed on the incoming packet path.
   */
  recordHeartbeat(userId: string): void {
    if (!userId) return;
    this.heartbeatBuffer.add(userId);
  }

  /**
   * Records a new socket connection for a user.
   * Returns true if user transitioned from OFFLINE to ONLINE.
   */
  recordUserOnline(userId: string, socketId: string): boolean {
    if (!userId || !socketId) return false;

    let sockets = this.localSockets.get(userId);
    const wasOffline = !sockets || sockets.size === 0;

    if (!sockets) {
      sockets = new Set<string>();
      this.localSockets.set(userId, sockets);
    }
    sockets.add(socketId);

    // Queue heartbeat and online status transition
    this.heartbeatBuffer.add(userId);
    if (wasOffline) {
      this.pendingTransitions.set(userId, 'online');
    }

    return wasOffline;
  }

  /**
   * Records a socket disconnection.
   * Returns true if user transitioned from ONLINE to OFFLINE (all sockets closed).
   */
  recordUserOffline(userId: string, socketId: string): boolean {
    if (!userId || !socketId) return false;

    const sockets = this.localSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.localSockets.delete(userId);
        this.pendingTransitions.set(userId, 'offline');
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if user has active local sockets.
   */
  isLocallyConnected(userId: string): boolean {
    const sockets = this.localSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  /**
   * Retrieves local socket IDs for a given user.
   */
  getLocalSockets(userId: string): string[] {
    const sockets = this.localSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Flushes aggregated in-memory heartbeats to Redis ZSET with sliding timestamp score.
   */
  async flushHeartbeats(): Promise<void> {
    if (this.heartbeatBuffer.size === 0) return;

    const userIds = Array.from(this.heartbeatBuffer);
    this.heartbeatBuffer.clear();

    const now = Date.now();
    const client = this.redisService.getClient();

    try {
      const pipeline = client.pipeline();

      // Batch ZADD for all aggregated users in one Redis roundtrip
      const zaddArgs: (string | number)[] = [PresenceEngineService.PRESENCE_ZSET_KEY];
      for (const userId of userIds) {
        zaddArgs.push(now, userId);
      }
      pipeline.zadd(...(zaddArgs as [string, ...(string | number)[]]));

      // Refresh sliding TTL on key
      pipeline.expire(PresenceEngineService.PRESENCE_ZSET_KEY, 86400);

      // Sliding expiration cleanup: remove users seen before threshold
      const expiredBefore = now - PresenceEngineService.OFFLINE_THRESHOLD_MS;
      pipeline.zremrangebyscore(PresenceEngineService.PRESENCE_ZSET_KEY, 0, expiredBefore);

      await pipeline.exec();
    } catch (err) {
      this.logger.warn(`Failed to flush heartbeat aggregation to Redis: ${String(err)}`);
    }
  }

  /**
   * Broadcasts compressed batch updates of online/offline status changes every 2.5–3 seconds.
   */
  flushPresenceBatch(): void {
    if (this.pendingTransitions.size === 0 || !this.server) return;

    const transitions = Array.from(this.pendingTransitions.entries());
    this.pendingTransitions.clear();

    const onlineUserIds: string[] = [];
    const offlineUserIds: string[] = [];

    for (const [userId, status] of transitions) {
      if (status === 'online') {
        onlineUserIds.push(userId);
      } else {
        offlineUserIds.push(userId);
      }
    }

    if (onlineUserIds.length === 0 && offlineUserIds.length === 0) return;

    const payload: PresenceBatchPayload = {
      online: onlineUserIds,
      offline: offlineUserIds,
      timestamp: Date.now(),
    };

    try {
      // 1. Broadcast compressed batch event
      this.server.emit(WS_EVENTS.PRESENCE_BATCH, payload);

      // 2. Backward compatibility: emit individual events in batch
      for (const userId of onlineUserIds) {
        this.server.emit(WS_EVENTS.USER_ONLINE, { userId });
      }
      for (const userId of offlineUserIds) {
        this.server.emit(WS_EVENTS.USER_OFFLINE, { userId });
      }
    } catch (err) {
      this.logger.warn(`Failed to broadcast presence batch: ${String(err)}`);
    }
  }

  /**
   * Checks whether a single user is currently online using Redis ZSET and hot cache.
   * Zero SQL executed.
   */
  async isUserOnline(userId: string): Promise<boolean> {
    if (!userId) return false;

    if (this.isLocallyConnected(userId) || this.heartbeatBuffer.has(userId)) {
      return true;
    }

    try {
      const client = this.redisService.getClient();
      const scoreRaw = await client.zscore(PresenceEngineService.PRESENCE_ZSET_KEY, userId);
      if (!scoreRaw) return false;

      const score = Number(scoreRaw);
      const threshold = Date.now() - PresenceEngineService.OFFLINE_THRESHOLD_MS;
      return score >= threshold;
    } catch (err) {
      this.logger.warn(`Failed to check online status for user ${userId}: ${String(err)}`);
      return false;
    }
  }

  /**
   * Checks online status for a list of users in a single Redis roundtrip without SQL queries.
   */
  async getOnlineUserIds(userIds: string[]): Promise<string[]> {
    if (!userIds || userIds.length === 0) return [];

    const uniqueIds = Array.from(new Set(userIds));
    const now = Date.now();
    const threshold = now - PresenceEngineService.OFFLINE_THRESHOLD_MS;

    const result = new Set<string>();
    const toQueryInRedis: string[] = [];

    for (const id of uniqueIds) {
      if (this.isLocallyConnected(id) || this.heartbeatBuffer.has(id)) {
        result.add(id);
      } else {
        toQueryInRedis.push(id);
      }
    }

    if (toQueryInRedis.length === 0) {
      return Array.from(result);
    }

    try {
      const client = this.redisService.getClient();
      const pipeline = client.pipeline();
      for (const id of toQueryInRedis) {
        pipeline.zscore(PresenceEngineService.PRESENCE_ZSET_KEY, id);
      }

      const scores = await pipeline.exec();
      if (scores) {
        scores.forEach((item, index) => {
          const [err, scoreVal] = item;
          if (!err && scoreVal) {
            const score = Number(scoreVal);
            if (score >= threshold) {
              result.add(toQueryInRedis[index]);
            }
          }
        });
      }
    } catch (err) {
      this.logger.warn(`Failed to batch resolve online users: ${String(err)}`);
    }

    return Array.from(result);
  }
}
