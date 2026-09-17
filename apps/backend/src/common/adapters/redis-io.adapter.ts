import { IoAdapter } from '@nestjs/platform-socket.io';
import { Logger } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import msgpackParser from 'socket.io-msgpack-parser';

interface SocketIoServerInstance {
  adapter?: (adapterConstructor: unknown) => void;
}

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | undefined;
  private pubClient?: Redis;
  private subClient?: Redis;

  async connectToRedis(redisUrl?: string): Promise<void> {
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not provided. Operating WebSocket in standalone memory mode.');
      return;
    }

    try {
      this.pubClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        connectTimeout: 3000,
        retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
      });

      this.subClient = this.pubClient.duplicate();

      let hasLoggedError = false;
      this.pubClient.on('error', (err: Error) => {
        if (!hasLoggedError) {
          this.logger.warn(`Redis Pub client connection error: ${err.message || 'ECONNREFUSED'}`);
          hasLoggedError = true;
        }
      });
      this.subClient.on('error', (err: Error) => {
        if (!hasLoggedError) {
          this.logger.warn(`Redis Sub client connection error: ${err.message || 'ECONNREFUSED'}`);
          hasLoggedError = true;
        }
      });

      await Promise.race([
        Promise.all([
          new Promise<void>((resolve) => {
            if (this.pubClient?.status === 'ready') return resolve();
            this.pubClient?.once('ready', () => resolve());
            this.pubClient?.once('error', () => resolve());
          }),
          new Promise<void>((resolve) => {
            if (this.subClient?.status === 'ready') return resolve();
            this.subClient?.once('ready', () => resolve());
            this.subClient?.once('error', () => resolve());
          }),
        ]),
        new Promise<void>((resolve) => setTimeout(resolve, 3000)),
      ]);

      if (this.pubClient.status === 'ready' && this.subClient.status === 'ready') {
        this.adapterConstructor = createAdapter(this.pubClient, this.subClient, {
          key: 'eternal:ws:cluster',
          requestsTimeout: 5000,
        });
        this.logger.log('Socket.io Distributed Redis Cluster Adapter attached successfully.');
      } else {
        this.logger.warn(
          'Redis Pub/Sub not in ready state within timeout. Falling back to in-memory adapter.',
        );
      }
    } catch (err) {
      this.logger.warn(
        `Failed to initialize Redis Socket.io adapter (${(err as Error).message}). Fallback to in-memory adapter.`,
      );
    }
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    const rawServer: unknown = super.createIOServer(port, {
      ...options,
      parser: msgpackParser,
      pingInterval: 10_000,
      pingTimeout: 5_000,
      maxHttpBufferSize: 2_000_000, // 2MB payload ceiling for enterprise media frames
      perMessageDeflate: false, // Zero CPU deflate bottleneck for million-connection scale
      httpCompression: false,
      transports: ['websocket', 'polling'],
      allowUpgrades: true,
    });

    const server = rawServer as SocketIoServerInstance;
    if (this.adapterConstructor && typeof server.adapter === 'function') {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }

  async close(): Promise<void> {
    try {
      if (this.pubClient) {
        if (this.pubClient.status === 'ready' || this.pubClient.status === 'connect') {
          await this.pubClient.quit();
        } else {
          this.pubClient.disconnect();
        }
      }
      if (this.subClient) {
        if (this.subClient.status === 'ready' || this.subClient.status === 'connect') {
          await this.subClient.quit();
        } else {
          this.subClient.disconnect();
        }
      }
    } catch {
      // ignore on teardown
    }
  }
}
