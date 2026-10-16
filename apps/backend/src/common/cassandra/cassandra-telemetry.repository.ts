import { Injectable, ServiceUnavailableException, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CallTelemetry } from '@prisma/client';
import type { Client } from 'cassandra-driver';
import { z } from 'zod';
import { createTelemetryClient } from './telemetry-client';

export const telemetrySchema = z.object({
  id: z.string(),
  callId: z.string(),
  userId: z.string(),
  avgRttMs: z.number().finite(),
  maxRttMs: z.number().finite().nullable(),
  packetLossRatio: z.number().finite(),
  jitterMs: z.number().finite().nullable(),
  audioCodec: z.string().nullable(),
  videoCodec: z.string().nullable(),
  durationMs: z.number().int(),
  endReason: z.string().nullable(),
  createdAt: z.coerce.date(),
});

const keySchema = z.object({
  userId: z.string(),
  callId: z.string(),
  createdAt: z.date(),
  id: z.string(),
});

@Injectable()
export class CassandraTelemetryRepository implements OnModuleDestroy {
  private readonly client: Client | undefined;
  readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.enabled = config.get<string>('CALL_TELEMETRY_STORAGE') === 'cassandra';
    const bundlePath = config.get<string>('CASSANDRA_SECURE_CONNECT_BUNDLE');
    const token = config.get<string>('CASSANDRA_APPLICATION_TOKEN');
    const keyspace = config.get<string>('CASSANDRA_KEYSPACE');
    if (bundlePath && token && keyspace) {
      this.client = createTelemetryClient({ bundlePath, token, keyspace });
    }
  }

  private getClient(): Client {
    if (!this.client) {
      throw new ServiceUnavailableException('Cassandra telemetry storage is not configured');
    }
    return this.client;
  }

  get configured(): boolean {
    return this.client !== undefined;
  }

  async connect(): Promise<void> {
    await this.getClient().connect();
  }

  async write(record: CallTelemetry): Promise<void> {
    await this.getClient().batch(
      [
        {
          query:
            'INSERT INTO call_telemetry_by_user (user_id, created_at, id, call_id, payload) VALUES (?, ?, ?, ?, ?)',
          params: [
            record.userId,
            record.createdAt,
            record.id,
            record.callId,
            JSON.stringify(record),
          ],
        },
        {
          query:
            'INSERT INTO call_telemetry_by_call (call_id, user_id, created_at, id) VALUES (?, ?, ?, ?)',
          params: [record.callId, record.userId, record.createdAt, record.id],
        },
      ],
      {
        prepare: true,
        logged: true,
        isIdempotent: true,
        timestamp: record.createdAt.getTime() * 1000,
      },
    );
  }

  async findForUser(userId: string, limit: number): Promise<CallTelemetry[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
      throw new Error('Telemetry limit must be between 1 and 500');
    }
    const result = await this.getClient().execute(
      'SELECT payload FROM call_telemetry_by_user WHERE user_id = ? LIMIT ?',
      [userId, limit],
      { fetchSize: limit },
    );
    return result.rows.map((row) => {
      const payload: unknown = row.get('payload');
      if (typeof payload !== 'string') throw new Error('Invalid Cassandra telemetry payload');
      const parsed: unknown = JSON.parse(payload);
      const record = telemetrySchema.parse(parsed);
      if (record.userId !== userId) throw new Error('Cassandra telemetry owner mismatch');
      return record;
    });
  }

  async purgeRecord(key: z.infer<typeof keySchema>): Promise<void> {
    await this.getClient().batch(this.deleteQueries(key), {
      prepare: true,
      logged: true,
      isIdempotent: true,
      // Always supersede a timed-out insert or logged-batch replay with the same key.
      timestamp: key.createdAt.getTime() * 1000 + 1,
    });
  }

  private deleteQueries(key: z.infer<typeof keySchema>) {
    return [
      {
        query: 'DELETE FROM call_telemetry_by_user WHERE user_id = ? AND created_at = ? AND id = ?',
        params: [key.userId, key.createdAt, key.id],
      },
      {
        query:
          'DELETE FROM call_telemetry_by_call WHERE call_id = ? AND user_id = ? AND created_at = ? AND id = ?',
        params: [key.callId, key.userId, key.createdAt, key.id],
      },
    ];
  }

  async purgeBatch(kind: 'user' | 'call', entityId: string): Promise<boolean> {
    const client = this.getClient();
    const table = kind === 'user' ? 'call_telemetry_by_user' : 'call_telemetry_by_call';
    const column = kind === 'user' ? 'user_id' : 'call_id';
    const result = await client.execute(
      `SELECT user_id, call_id, created_at, id FROM ${table} WHERE ${column} = ? LIMIT 25`,
      [entityId],
      { fetchSize: 25 },
    );
    // One bounded page per worker claim. Keep the intent until an empty page confirms completion.
    const keys = result.rows.map((row) => {
      const userId: unknown = row.get('user_id');
      const callId: unknown = row.get('call_id');
      const createdAt: unknown = row.get('created_at');
      const id: unknown = row.get('id');
      return keySchema.parse({ userId, callId, createdAt, id });
    });
    if (keys.length > 0)
      await client.batch(
        keys.flatMap((key) => this.deleteQueries(key)),
        {
          prepare: true,
          logged: true,
          isIdempotent: true,
          timestamp: Math.max(...keys.map((key) => key.createdAt.getTime() * 1000)) + 1,
        },
      );
    return result.rows.length === 0;
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.shutdown();
  }
}
