import { Injectable, Logger, Optional } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '@common/prisma';

export type JamQueuePolicy = 'dj_only' | 'open_queue';
export type JamRoomStatus = 'active' | 'reconnecting';

export interface JamListenerProfile {
  id: string;
  username: string;
  avatar?: string | undefined;
  isHost?: boolean | undefined;
  socketId?: string | undefined;
}

export interface JamTrack {
  id: string;
  title: string;
  artist: string;
  albumArt?: string | undefined;
  durationMs: number;
  previewUrl?: string | null | undefined;
  spotifyUrl?: string | undefined;
  source?: 'platform' | 'spotify' | 'soundcloud' | undefined;
  streamUrl?: string | undefined;
}

export interface JamRoom {
  roomId: string;
  hostUserId: string;
  hostUsername: string;
  hostAvatar?: string | undefined;
  currentTrack: JamTrack | null;
  trackSource: 'platform' | 'spotify' | 'soundcloud';
  positionMs: number;
  isPlaying: boolean;
  status: JamRoomStatus;
  listeners: JamListenerProfile[];
  queuePolicy: JamQueuePolicy;
  queue: JamTrack[];
  lastPreloadTrackId?: string | undefined;
  updatedAt: number;
  createdAt: number;
}

export interface JamSyncPayload {
  roomId: string;
  trackId?: string | undefined;
  positionMs: number;
  isPlaying: boolean;
  timestamp: number;
  currentTrack?: JamTrack | null | undefined;
}

@Injectable()
export class JamService {
  private readonly logger = new Logger(JamService.name);

  // In-memory cache for ultra-low latency WebSocket lookups
  private readonly rooms = new Map<string, JamRoom>();
  private readonly userRoomMap = new Map<string, string>(); // userId -> roomId
  private readonly graceTimers = new Map<string, NodeJS.Timeout>(); // roomId -> timer

  private readonly GRACE_PERIOD_MS = 15_000; // 15 seconds grace period for F5 / temporary network flicker

  constructor(
    private readonly redisService: RedisService,
    @Optional()
    private readonly prisma?: PrismaService,
  ) {}

  /**
   * Generates a clean, human-friendly room ID based on host userId or timestamp
   */
  private generateRoomId(hostUserId: string): string {
    const cleanId = hostUserId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12);
    return `jam_${cleanId}`;
  }

  /**
   * Persist room state to Redis for clustering and durability
   */
  private async persistRoom(room: JamRoom): Promise<void> {
    try {
      this.rooms.set(room.roomId, room);
      for (const listener of room.listeners) {
        this.userRoomMap.set(listener.id, room.roomId);
      }
      await this.redisService.set(
        `jam:room:${room.roomId}`,
        JSON.stringify(room),
        86400, // 24 hours TTL
      );
    } catch (err) {
      this.logger.warn(
        `Failed to persist Jam room ${room.roomId} to Redis: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Removes room state from Redis and memory
   */
  private async removeRoom(roomId: string): Promise<void> {
    try {
      const room = this.rooms.get(roomId);
      if (room) {
        for (const listener of room.listeners) {
          this.userRoomMap.delete(listener.id);
        }
      }
      this.rooms.delete(roomId);
      this.cancelDisconnectGrace(roomId);
      await this.redisService.del(`jam:room:${roomId}`);
    } catch (err) {
      this.logger.warn(`Failed to remove Jam room ${roomId} from Redis: ${(err as Error).message}`);
    }
  }

  /**
   * Creates or resets a Jam room with Host Authority
   */
  async createRoom(
    hostUserId: string,
    hostProfile: { username: string; avatar?: string },
    initialTrack: JamTrack | null,
    queuePolicy: JamQueuePolicy = 'dj_only',
  ): Promise<JamRoom> {
    const roomId = this.generateRoomId(hostUserId);

    // Cancel any existing grace timer for this room if host returned
    this.cancelDisconnectGrace(roomId);

    const now = Date.now();
    const source: 'platform' | 'spotify' | 'soundcloud' =
      initialTrack?.source || (initialTrack?.id?.startsWith('sc-') ? 'soundcloud' : 'platform');

    const hostListener: JamListenerProfile = {
      id: hostUserId,
      username: hostProfile.username,
      avatar: hostProfile.avatar,
      isHost: true,
    };

    const room: JamRoom = {
      roomId,
      hostUserId,
      hostUsername: hostProfile.username,
      hostAvatar: hostProfile.avatar,
      currentTrack: initialTrack,
      trackSource: source,
      positionMs: 0,
      isPlaying: true,
      status: 'active',
      listeners: [hostListener],
      queuePolicy,
      queue: [],
      updatedAt: now,
      createdAt: now,
    };

    await this.persistRoom(room);
    this.logger.log(
      `[Jam] Room created: ${roomId} by host @${hostProfile.username} (${hostUserId})`,
    );
    return room;
  }

  /**
   * Retrieves an active Jam room by roomId
   */
  async getRoom(roomId: string): Promise<JamRoom | null> {
    if (this.rooms.has(roomId)) {
      return this.rooms.get(roomId)!;
    }

    // Try loading from Redis
    const raw = await this.redisService.get(`jam:room:${roomId}`);
    if (raw) {
      try {
        const room = JSON.parse(raw) as JamRoom;
        this.rooms.set(roomId, room);
        return room;
      } catch {}
    }

    return null;
  }

  /**
   * Finds the room where a user is currently a host or listener
   */
  async getRoomByUser(userId: string): Promise<JamRoom | null> {
    const roomId = this.userRoomMap.get(userId);
    if (roomId) {
      return this.getRoom(roomId);
    }
    return null;
  }

  /**
   * Finds the room hosted by a specific user
   */
  async getRoomByHost(hostUserId: string): Promise<JamRoom | null> {
    const roomId = this.generateRoomId(hostUserId);
    return this.getRoom(roomId);
  }

  /**
   * Adds a listener to a room
   */
  async joinRoom(
    roomId: string,
    listenerUserId: string,
    listenerProfile: { username: string; avatar?: string },
  ): Promise<{ room: JamRoom; isNew: boolean } | null> {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    // If host was in reconnecting state and rejoins, reactivate room immediately
    if (room.hostUserId === listenerUserId) {
      this.cancelDisconnectGrace(roomId);
      room.status = 'active';
    }

    const existingIdx = room.listeners.findIndex((l) => l.id === listenerUserId);
    let isNew = false;

    if (existingIdx >= 0) {
      // Update profile info
      room.listeners[existingIdx] = {
        ...room.listeners[existingIdx],
        username: listenerProfile.username,
        avatar: listenerProfile.avatar || room.listeners[existingIdx].avatar,
      };
    } else {
      room.listeners.push({
        id: listenerUserId,
        username: listenerProfile.username,
        avatar: listenerProfile.avatar,
        isHost: listenerUserId === room.hostUserId,
      });
      isNew = true;
    }

    this.userRoomMap.set(listenerUserId, roomId);
    await this.persistRoom(room);
    this.logger.log(`[Jam] User @${listenerProfile.username} joined room ${roomId}`);
    return { room, isNew };
  }

  /**
   * Removes a user from a room with host transfer or closing logic
   */
  async leaveRoom(
    roomId: string,
    userId: string,
  ): Promise<{
    room: JamRoom | null;
    closed: boolean;
    transferred: boolean;
    newHost?: JamListenerProfile;
  }> {
    const room = await this.getRoom(roomId);
    if (!room) {
      return { room: null, closed: true, transferred: false };
    }

    this.userRoomMap.delete(userId);
    room.listeners = room.listeners.filter((l) => l.id !== userId);

    // If host leaves
    if (userId === room.hostUserId) {
      if (room.listeners.length === 0) {
        // No participants left, close room
        await this.removeRoom(roomId);
        this.logger.log(`[Jam] Room ${roomId} closed because host left and no listeners remain.`);
        return { room: null, closed: true, transferred: false };
      }

      // Transfer host to first remaining listener
      const newHost = room.listeners[0];
      newHost.isHost = true;
      room.hostUserId = newHost.id;
      room.hostUsername = newHost.username;
      room.hostAvatar = newHost.avatar;

      await this.persistRoom(room);
      this.logger.log(
        `[Jam] Room ${roomId} host transferred to @${newHost.username} (${newHost.id})`,
      );
      return { room, closed: false, transferred: true, newHost };
    }

    await this.persistRoom(room);
    return { room, closed: false, transferred: false };
  }

  /**
   * Updates playback state strictly from Host authority
   */
  async hostSync(
    roomId: string,
    hostUserId: string,
    payload: {
      trackId?: string;
      positionMs: number;
      isPlaying: boolean;
      timestamp: number;
      currentTrack?: JamTrack | null;
    },
  ): Promise<JamSyncPayload | null> {
    const room = await this.getRoom(roomId);
    if (!room || room.hostUserId !== hostUserId) {
      return null;
    }

    room.positionMs = payload.positionMs;
    room.isPlaying = payload.isPlaying;
    room.updatedAt = payload.timestamp || Date.now();

    if (payload.currentTrack) {
      room.currentTrack = payload.currentTrack;
      room.trackSource =
        payload.currentTrack.source ||
        (payload.currentTrack.id?.startsWith('sc-') ? 'soundcloud' : 'platform');
    }

    await this.persistRoom(room);

    return {
      roomId,
      trackId: payload.trackId || room.currentTrack?.id,
      positionMs: room.positionMs,
      isPlaying: room.isPlaying,
      timestamp: room.updatedAt,
      currentTrack: room.currentTrack,
    };
  }

  /**
   * Adds a track to the room queue according to queuePolicy
   */
  async queueAdd(
    roomId: string,
    userId: string,
    track: JamTrack,
  ): Promise<{ success: boolean; room: JamRoom | null; error?: string }> {
    const room = await this.getRoom(roomId);
    if (!room) {
      return { success: false, room: null, error: 'Room not found' };
    }

    const isHost = userId === room.hostUserId;
    if (room.queuePolicy === 'dj_only' && !isHost) {
      return {
        success: false,
        room,
        error: 'In "DJ" mode, only the host can add tracks to the queue',
      };
    }

    // Spotify Premium Verification check:
    if (track.source === 'spotify' && this.prisma) {
      try {
        const showcase = await this.prisma.profileShowcase.findUnique({
          where: { userId },
        });
        const connectedAccounts = showcase?.connectedAccounts as Record<string, unknown> | null;
        const spotify = connectedAccounts?.spotify as
          { verified?: boolean; product?: string } | undefined;
        if (!spotify?.verified || spotify?.product !== 'premium') {
          return {
            success: false,
            room,
            error:
              'Listening to full tracks from Spotify requires an integrated account with an active Spotify Premium subscription. We recommend SoundCloud or Platform tracks!',
          };
        }
      } catch (e) {
        this.logger.warn(`Could not verify Spotify Premium: ${(e as Error).message}`);
      }
    }

    room.queue.push(track);
    await this.persistRoom(room);
    this.logger.log(`[Jam] Track "${track.title}" added to queue in ${roomId} by user ${userId}`);
    return { success: true, room };
  }

  /**
   * Host updates queue policy ('dj_only' vs 'open_queue')
   */
  async updatePolicy(
    roomId: string,
    hostUserId: string,
    policy: JamQueuePolicy,
  ): Promise<JamRoom | null> {
    const room = await this.getRoom(roomId);
    if (!room || room.hostUserId !== hostUserId) {
      return null;
    }

    room.queuePolicy = policy;
    await this.persistRoom(room);
    this.logger.log(`[Jam] Room ${roomId} queue policy updated to ${policy}`);
    return room;
  }

  /**
   * Record preloading intent for upcoming track
   */
  async recordPreload(roomId: string, hostUserId: string, trackId: string): Promise<boolean> {
    const room = await this.getRoom(roomId);
    if (!room || room.hostUserId !== hostUserId) return false;
    room.lastPreloadTrackId = trackId;
    return true;
  }

  /**
   * Grace Period management on socket disconnect:
   * Prevents tearing down the room immediately on page refresh (F5) or network blip.
   */
  scheduleDisconnectGrace(
    userId: string,
    onTimeout: (roomId: string, closed: boolean, newHost?: JamListenerProfile) => void,
  ): void {
    const roomId = this.userRoomMap.get(userId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    // Only host disconnects trigger the reconnecting grace state
    if (room.hostUserId === userId) {
      this.cancelDisconnectGrace(roomId);
      room.status = 'reconnecting';

      this.logger.log(
        `[Jam] Host @${room.hostUsername} disconnected. Starting ${this.GRACE_PERIOD_MS / 1000}s Grace Period for ${roomId}...`,
      );

      const timer = setTimeout(() => {
        void (async () => {
          this.graceTimers.delete(roomId);
          this.logger.log(
            `[Jam] Grace period expired for ${roomId}. Host did not return. Terminating room for all listeners.`,
          );
          await this.removeRoom(roomId);
          onTimeout(roomId, true, undefined);
        })();
      }, this.GRACE_PERIOD_MS);

      this.graceTimers.set(roomId, timer);
    } else {
      // Regular listener disconnect: graceful leave after 5 seconds if not reconnected
      const timer = setTimeout(() => {
        void (async () => {
          const curRoom = this.rooms.get(roomId);
          if (curRoom && !curRoom.listeners.some((l) => l.id === userId && l.socketId)) {
            await this.leaveRoom(roomId, userId);
            onTimeout(roomId, false, undefined);
          }
        })();
      }, 5_000);
      this.graceTimers.set(`listener_${userId}`, timer);
    }
  }

  /**
   * Cancels any pending grace timer when host/user reconnects
   */
  cancelDisconnectGrace(roomIdOrKey: string): void {
    const keys = [roomIdOrKey, `jam_${roomIdOrKey}`, roomIdOrKey.replace(/^jam_/, '')];
    for (const key of keys) {
      const timer = this.graceTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.graceTimers.delete(key);
        this.logger.log(`[Jam] Grace timer cancelled for ${key} - user successfully reconnected.`);
      }
    }
  }
}
