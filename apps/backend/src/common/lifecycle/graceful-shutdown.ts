import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'http';
import type { RedisIoAdapter } from '../adapters/redis-io.adapter';
import { FdGuard } from './fd-guard';

export interface GracefulShutdownOptions {
  timeoutMs?: number;
  signals?: NodeJS.Signals[];
  exitProcess?: boolean;
}

export function setupGracefulShutdown(
  app: INestApplication,
  redisIoAdapter?: RedisIoAdapter,
  options?: GracefulShutdownOptions,
): () => Promise<void> {
  const logger = new Logger('GracefulShutdown');
  const timeoutMs = options?.timeoutMs ?? Number(process.env.SHUTDOWN_TIMEOUT_MS || 15_000);
  const signals: NodeJS.Signals[] = options?.signals ?? ['SIGTERM', 'SIGINT'];
  const shouldExit =
    options?.exitProcess ?? (process.env.NODE_ENV !== 'test' && !process.env.VERCEL);

  let isShuttingDown = false;

  const shutdown = async (signal = 'MANUAL') => {
    if (isShuttingDown) {
      logger.warn(`Shutdown already in progress. Ignoring duplicate signal: ${signal}`);
      return;
    }
    isShuttingDown = true;
    logger.log(`Received ${signal}. Initiating graceful shutdown (timeout: ${timeoutMs}ms)...`);

    const forceTimer = setTimeout(() => {
      logger.error(`Graceful shutdown timed out after ${timeoutMs}ms. Forcing process exit.`);
      if (shouldExit) {
        process.exit(1);
      }
    }, timeoutMs);

    if (typeof forceTimer.unref === 'function') {
      forceTimer.unref();
    }

    try {
      // 1. Stop receiving new HTTP requests
      try {
        const httpServer = app.getHttpServer() as Server | undefined;
        if (httpServer && typeof httpServer.close === 'function') {
          await new Promise<void>((resolve) => {
            httpServer.close(() => resolve());
            if (typeof httpServer.closeIdleConnections === 'function') {
              httpServer.closeIdleConnections();
            }
          });
          logger.log('HTTP server listener closed to new connections.');
        }
      } catch (err) {
        logger.warn(`Error closing HTTP server listener: ${(err as Error).message}`);
      }

      // 2. Stop receiving new WebSocket connections and drain with reconnect_with_backoff & jitter
      try {
        const gateway = app.get<{ drainSockets?: (opts?: unknown) => Promise<void> }>(
          'MessengerGateway',
          { strict: false },
        );
        if (gateway && typeof gateway.drainSockets === 'function') {
          const drainTimeout = Math.min(timeoutMs / 2, 8000);
          logger.log(`Draining WebSocket connections gracefully (max ${drainTimeout}ms)...`);
          await gateway.drainSockets({ maxDurationMs: drainTimeout });
          logger.log('WebSocket connections drained with backoff.');
        }
      } catch (err) {
        logger.warn(`Error during WebSocket gateway socket draining: ${(err as Error).message}`);
      }

      if (redisIoAdapter && typeof redisIoAdapter.close === 'function') {
        try {
          await redisIoAdapter.close();
          logger.log('WebSocket Redis adapter connections closed.');
        } catch (err) {
          logger.warn(`Error closing WebSocket adapter: ${(err as Error).message}`);
        }
      }

      // 3. Trigger NestJS module destroy hooks (Database pool end, Redis quit, Queues close, Workers stop)
      await app.close();
      FdGuard.cleanup();
      logger.log('Application services and database connections cleanly closed.');

      clearTimeout(forceTimer);

      if (shouldExit) {
        process.exit(0);
      }
    } catch (err) {
      clearTimeout(forceTimer);
      logger.error(`Error during graceful shutdown: ${(err as Error).message}`);
      if (shouldExit) {
        process.exit(1);
      }
    }
  };

  if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
    for (const signal of signals) {
      process.on(signal, () => {
        void shutdown(signal);
      });
    }
  }

  return () => shutdown('MANUAL');
}
