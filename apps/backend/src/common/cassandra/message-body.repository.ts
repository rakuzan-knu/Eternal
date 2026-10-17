import {
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { types, type Client } from 'cassandra-driver';
import { createTelemetryClient } from './telemetry-client';

export const MESSAGE_BODY_SCHEMA = `CREATE TABLE IF NOT EXISTS message_bodies (
  message_id text PRIMARY KEY, revision bigint, body text
)`;

@Injectable()
export class MessageBodyRepository implements OnModuleDestroy {
  private readonly client: Client | undefined;

  constructor(
    config: ConfigService,
    @Optional() @Inject('CASSANDRA_MESSAGE_CLIENT') client?: Client,
  ) {
    if (client) {
      this.client = client;
      return;
    }
    const bundlePath = config.get<string>('CASSANDRA_SECURE_CONNECT_BUNDLE');
    const token = config.get<string>('CASSANDRA_APPLICATION_TOKEN');
    const keyspace = config.get<string>('CASSANDRA_KEYSPACE');
    if (bundlePath && token && keyspace)
      this.client = createTelemetryClient({ bundlePath, token, keyspace });
  }

  get configured(): boolean {
    return Boolean(this.client);
  }

  private connection(): Client {
    if (!this.client) throw new ServiceUnavailableException('Message history is unavailable');
    return this.client;
  }

  async connect(): Promise<void> {
    await this.connection().connect();
  }

  async initialize(): Promise<void> {
    await this.connection().execute(MESSAGE_BODY_SCHEMA);
  }

  async check(): Promise<void> {
    await this.connection().execute('SELECT message_id FROM message_bodies LIMIT 1');
  }

  async read(id: string): Promise<{ revision: bigint; body: string } | null> {
    const result = await this.connection().execute(
      'SELECT revision, body FROM message_bodies WHERE message_id = ?',
      [id],
      { prepare: true },
    );
    const row = result.first();
    if (!row) return null;
    const revision: unknown = row.get('revision');
    const body: unknown = row.get('body');
    if (!(revision instanceof types.Long) || typeof body !== 'string')
      throw new ServiceUnavailableException('Message history is incomplete');
    return { revision: BigInt(revision.toString()), body };
  }

  async write(id: string, revision: bigint, body: string): Promise<void> {
    const version = types.Long.fromString(revision.toString());
    await this.connection().execute(
      'INSERT INTO message_bodies (message_id, revision, body) VALUES (?, ?, ?)',
      [id, version, body],
      { prepare: true, timestamp: version, isIdempotent: true },
    );
  }

  async purge(id: string, revision: bigint): Promise<void> {
    await this.connection().execute('DELETE FROM message_bodies WHERE message_id = ?', [id], {
      prepare: true,
      timestamp: types.Long.fromString(revision.toString()),
      isIdempotent: true,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.shutdown();
  }
}
