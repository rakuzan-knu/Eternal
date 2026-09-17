/**
 * PostgreSQL Change Data Capture (CDC) & Reactive Event Bus
 *
 * Listens to real-time PostgreSQL database change notifications (WAL / LISTEN-NOTIFY / CDC)
 * for calls, room participants, and permissions, transforming changes into
 * internal NestJS EventEmitter events and broadcasting to Redis Pub/Sub without polling.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Client as PgClient } from 'pg';
import { RedisService } from '../../redis/redis.service';

export interface CDCRoomPayload {
  table: 'calls' | 'call_participants' | 'call_permissions';
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  callId: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export const CALLS_CDC_EVENTS = {
  ROOM_CHANGED: 'calls.room.changed',
  PARTICIPANT_CHANGED: 'calls.participant.changed',
  PERMISSIONS_CHANGED: 'calls.permissions.changed',
} as const;

@Injectable()
export class CallsCDCService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CallsCDCService.name);
  private pgClient: PgClient | null = null;
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
    @Optional()
    private readonly redisService?: RedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initCDCListener();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pgClient) {
      try {
        await this.pgClient.end();
      } catch {
        // Safe end
      }
      this.pgClient = null;
    }
    this.isConnected = false;
  }

  private isConnecting = false;
  private hasWarnedUnavailable = false;
  private reconnectDelayMs = 5000;

  /**
   * Connects to PostgreSQL notification stream for CDC event ingestion
   */
  public async initCDCListener(): Promise<void> {
    if (this.isConnecting || this.isConnected) return;

    const dbUrl = this.configService.get<string>('DATABASE_URL');
    if (!dbUrl) {
      if (!this.hasWarnedUnavailable) {
        this.logger.warn('DATABASE_URL not configured. Running in synthetic CDC mode.');
        this.hasWarnedUnavailable = true;
      }
      return;
    }

    this.isConnecting = true;

    // Clean up any stale client before creating a new one
    if (this.pgClient) {
      try {
        await this.pgClient.end();
      } catch {
        // ignore
      }
      this.pgClient = null;
    }

    try {
      this.pgClient = new PgClient({ connectionString: dbUrl });
      await this.pgClient.connect();
      this.isConnected = true;
      if (this.hasWarnedUnavailable) {
        this.hasWarnedUnavailable = false;
        this.logger.log('PostgreSQL CDC connection established on channel: calls_cdc_events');
      }
      this.reconnectDelayMs = 5000;

      // Listen on designated CDC notifications channel
      await this.pgClient.query('LISTEN calls_cdc_events');

      this.pgClient.on('notification', (msg) => {
        if (msg.channel === 'calls_cdc_events' && msg.payload) {
          try {
            const parsed = JSON.parse(msg.payload) as CDCRoomPayload;
            this.handleCDCChange(parsed);
          } catch (err) {
            this.logger.warn(`Failed to parse CDC notification payload: ${String(err)}`);
          }
        }
      });

      this.pgClient.on('error', (err) => {
        this.logger.warn(`PostgreSQL CDC connection error: ${err.message}. Retrying...`);
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.logger.log('PostgreSQL CDC listener active on channel: calls_cdc_events');
    } catch (err) {
      if (this.pgClient) {
        try {
          await this.pgClient.end();
        } catch {
          // ignore
        }
        this.pgClient = null;
      }
      if (!this.hasWarnedUnavailable) {
        this.logger.warn(
          `PostgreSQL CDC init failed: ${String(err)}. Falling back to in-memory event bus.`,
        );
        this.hasWarnedUnavailable = true;
      } else {
        this.logger.debug?.(`PostgreSQL CDC reconnect attempt failed: ${String(err)}`);
      }
      this.isConnected = false;
      this.scheduleReconnect();
    } finally {
      this.isConnecting = false;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.initCDCListener();
    }, this.reconnectDelayMs);

    if (this.reconnectTimer && typeof this.reconnectTimer.unref === 'function') {
      this.reconnectTimer.unref();
    }
    this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 1.5, 60_000);
  }

  /**
   * Processes change events from database or synthetic triggers
   */
  public handleCDCChange(payload: CDCRoomPayload): void {
    const eventName =
      payload.table === 'call_participants'
        ? CALLS_CDC_EVENTS.PARTICIPANT_CHANGED
        : payload.table === 'call_permissions'
          ? CALLS_CDC_EVENTS.PERMISSIONS_CHANGED
          : CALLS_CDC_EVENTS.ROOM_CHANGED;

    // 1. Emit internal NestJS event
    this.eventEmitter?.emit(eventName, payload);

    // 2. Broadcast via Redis Pub/Sub for distributed horizontal gateway instances
    try {
      const redisClient = this.redisService?.getClient();
      if (redisClient && typeof redisClient.publish === 'function') {
        void redisClient.publish(
          `calls:cdc:${payload.callId}`,
          JSON.stringify({ event: eventName, payload }),
        );
      }
    } catch {
      // Redis optional fallback
    }
  }

  /**
   * Programmatic trigger for testing or environments where PostgreSQL LISTEN/NOTIFY triggers are managed in app layer
   */
  public triggerSyntheticChange(
    table: CDCRoomPayload['table'],
    action: CDCRoomPayload['action'],
    callId: string,
    data: Record<string, unknown>,
  ): void {
    this.handleCDCChange({
      table,
      action,
      callId,
      data,
      timestamp: Date.now(),
    });
  }

  public isListening(): boolean {
    return this.isConnected;
  }
}
