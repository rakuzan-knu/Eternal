import { Injectable, Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { WS_EVENTS } from '../events/ws-events';

export interface DrainOptions {
  /** Target sockets to disconnect per second (default: 1000) */
  drainRatePerSec?: number;
  /** Maximum overall draining duration before forcing disconnect (default: 10,000ms) */
  maxDurationMs?: number;
  /** Minimum reconnect backoff in milliseconds (default: 1,000ms) */
  minBackoffMs?: number;
  /** Maximum reconnect backoff in milliseconds (default: 15,000ms) */
  maxBackoffMs?: number;
}

/**
 * WebSocket Connection Draining Service:
 *
 * Prevents Reconnect Storms (thundering herd / instant DDOS of API) upon server restart or deployment.
 * Staggeredly closes connections at N sockets/second while providing clients with a jittered
 * `reconnect_with_backoff` payload to distribute reconnect requests over time.
 */
@Injectable()
export class WsDrainingService {
  private readonly logger = new Logger(WsDrainingService.name);
  private isDrainingState = false;

  get isDraining(): boolean {
    return this.isDrainingState;
  }

  /**
   * Smoothly drains all connected sockets across the Socket.IO server.
   */
  async drainSockets(server: Server | undefined, options?: DrainOptions): Promise<void> {
    if (!server) return;
    if (this.isDrainingState) {
      this.logger.warn('Socket draining already in progress.');
      return;
    }

    this.isDrainingState = true;

    const drainRatePerSec = Math.max(50, options?.drainRatePerSec ?? 1000);
    const maxDurationMs = Math.max(1000, options?.maxDurationMs ?? 10_000);
    const minBackoffMs = options?.minBackoffMs ?? 1000;
    const maxBackoffMs = options?.maxBackoffMs ?? 15_000;

    // Collect all active sockets from all namespaces (default, /messenger, etc.)
    const socketsToDrain: Socket[] = [];

    try {
      if (server.sockets?.sockets) {
        server.sockets.sockets.forEach((s) => socketsToDrain.push(s));
      }
      if (server._nsps) {
        for (const [, nsp] of server._nsps) {
          if (nsp.sockets) {
            nsp.sockets.forEach((s: Socket) => {
              if (!socketsToDrain.includes(s)) {
                socketsToDrain.push(s);
              }
            });
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to inspect sockets for draining: ${String(err)}`);
    }

    const totalSockets = socketsToDrain.length;
    if (totalSockets === 0) {
      this.logger.log('No active WebSocket connections to drain.');
      return;
    }

    this.logger.log(
      `Starting smooth connection draining for ${totalSockets} sockets at ~${drainRatePerSec} sockets/sec...`,
    );

    const startTime = process.hrtime.bigint();
    const batchIntervalMs = 200; // process 5 batches per second
    const batchSize = Math.max(1, Math.ceil((drainRatePerSec * batchIntervalMs) / 1000));

    let processedCount = 0;

    for (let i = 0; i < totalSockets; i += batchSize) {
      const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
      const remainingTime = maxDurationMs - elapsedMs;
      if (remainingTime <= 0) {
        this.logger.warn(
          `Draining timeout reached (${maxDurationMs}ms). Disconnecting remaining ${totalSockets - processedCount} sockets immediately.`,
        );
        break;
      }

      const batch = socketsToDrain.slice(i, i + batchSize);

      for (const socket of batch) {
        try {
          if (socket.connected) {
            // Compute randomized jitter backoff to avoid synchronized reconnects
            const jitterMs =
              Math.floor(Math.random() * (maxBackoffMs - minBackoffMs)) + minBackoffMs;

            socket.emit(WS_EVENTS.RECONNECT_WITH_BACKOFF, {
              reconnectAfterMs: jitterMs,
              reason: 'server_shutdown',
            });

            socket.disconnect(true);
          }
        } catch {
          // ignore disconnect errors during shutdown
        }
        processedCount++;
      }

      if (i + batchSize < totalSockets) {
        await new Promise((resolve) => setTimeout(resolve, batchIntervalMs));
      }
    }

    const elapsed = Math.round(Number(process.hrtime.bigint() - startTime) / 1_000_000);
    this.logger.log(
      `Successfully drained ${processedCount} sockets in ${elapsed}ms without thundering herd.`,
    );
  }
}
