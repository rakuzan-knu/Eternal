import * as fs from 'node:fs';
import type { Server as HttpServer } from 'node:http';
import type { Socket } from 'node:net';
import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

export interface FdGuardOptions {
  sentinelFilePath?: string;
  backoffMs?: number;
}

export class FdGuard {
  private static readonly logger = new Logger('FdGuard');
  private static reservedFd: number | null = null;
  private static sentinelPath: string = __filename;
  private static isSaturated = false;
  private static backoffTimer: NodeJS.Timeout | null = null;

  /**
   * Initializes the FD Sentinel reserve.
   */
  static init(options?: FdGuardOptions): void {
    if (options?.sentinelFilePath) {
      this.sentinelPath = options.sentinelFilePath;
    }
    this.acquireSentinel();
  }

  /**
   * Attaches EMFILE/ENFILE error traps to the HTTP/TCP server.
   */
  static attachToServer(app: INestApplication, options?: FdGuardOptions): () => void {
    this.init(options);

    let httpServer: HttpServer | undefined;
    try {
      httpServer = app.getHttpServer() as HttpServer | undefined;
    } catch {
      // ignore if server not initialized yet
    }

    if (!httpServer || typeof httpServer.on !== 'function') {
      this.logger.warn('HTTP Server instance not available to attach FdGuard listener.');
      return () => this.cleanup();
    }

    const onServerError = (err: Error & { code?: string }) => {
      if (err.code === 'EMFILE' || err.code === 'ENFILE') {
        this.handleFdExhaustion(httpServer);
      }
    };

    const onClientError = (err: Error & { code?: string }, socket: Socket) => {
      if (err.code === 'EMFILE' || err.code === 'ENFILE' || this.isSaturated) {
        this.rejectSocketGracefully(socket);
      }
    };

    httpServer.on('error', onServerError);
    httpServer.on('clientError', onClientError);

    // Trap process-level uncaught EMFILE to prevent crash
    const onProcessError = (err: Error & { code?: string }) => {
      if (err.code === 'EMFILE' || err.code === 'ENFILE') {
        this.logger.error(`Process-wide FD Exhaustion (${err.code}): ${err.message}`);
        this.handleFdExhaustion(httpServer);
      }
    };

    process.on('uncaughtExceptionMonitor', onProcessError);

    return () => {
      httpServer?.removeListener('error', onServerError);
      httpServer?.removeListener('clientError', onClientError);
      process.removeListener('uncaughtExceptionMonitor', onProcessError);
      this.cleanup();
    };
  }

  private static acquireSentinel(): boolean {
    if (this.reservedFd !== null) return true;
    try {
      /* eslint-disable no-sync, no-restricted-syntax */
      this.reservedFd = fs.openSync(this.sentinelPath, 'r');
      /* eslint-enable no-sync, no-restricted-syntax */
      this.isSaturated = false;
      return true;
    } catch (err) {
      this.logger.warn(`Could not acquire sentinel FD: ${(err as Error).message}`);
      return false;
    }
  }

  private static releaseSentinel(): void {
    if (this.reservedFd !== null) {
      try {
        /* eslint-disable no-sync, no-restricted-syntax */
        fs.closeSync(this.reservedFd);
        /* eslint-enable no-sync, no-restricted-syntax */
      } catch {
        // ignore
      }
      this.reservedFd = null;
    }
  }

  private static handleFdExhaustion(server?: HttpServer): void {
    this.isSaturated = true;
    this.logger.warn(
      'System File Descriptor Limit reached (EMFILE/ENFILE). Releasing sentinel FD to reject incoming connection safely.',
    );

    // Free 1 reserved slot in Linux/Node FD table
    this.releaseSentinel();

    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
    }

    // Schedule re-acquisition of sentinel with backoff
    this.backoffTimer = setTimeout(() => {
      const acquired = this.acquireSentinel();
      if (!acquired && server) {
        this.logger.warn('FD table still saturated. Retrying sentinel re-acquisition in 150ms.');
        this.handleFdExhaustion(server);
      } else {
        this.logger.log('FD sentinel recovered. Resuming normal connection ingress.');
      }
    }, 150);

    if (this.backoffTimer.unref) {
      this.backoffTimer.unref();
    }
  }

  private static rejectSocketGracefully(socket: Socket): void {
    try {
      if (socket.writable) {
        const payload =
          'HTTP/1.1 503 Service Unavailable\r\n' +
          'Content-Type: text/plain\r\n' +
          'Retry-After: 5\r\n' +
          'Connection: close\r\n' +
          'Content-Length: 42\r\n\r\n' +
          'Server is at capacity. Please retry later.\r\n';
        socket.end(payload);
      } else {
        socket.destroy();
      }
    } catch {
      socket.destroy();
    }
  }

  static cleanup(): void {
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = null;
    }
    this.releaseSentinel();
  }
}

export function setupFdGuard(app: INestApplication, options?: FdGuardOptions): () => void {
  return FdGuard.attachToServer(app, options);
}
