import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import type { Socket } from 'socket.io';

export type EventPriority = 'ephemeral' | 'critical';

export interface BackpressureOptions {
  maxWriteBufferPackets?: number;
  maxBufferedBytes?: number;
  dangerBufferedBytes?: number;
  maxQueuedCriticalEvents?: number;
}

interface QueuedEvent {
  event: string;
  payload: unknown;
}

@Injectable()
export class WsBackpressureService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WsBackpressureService.name);

  private readonly maxWriteBufferPackets: number;
  private readonly maxBufferedBytes: number;
  private readonly dangerBufferedBytes: number;
  private readonly maxQueuedCriticalEvents: number;

  private readonly socketQueues = new Map<string, QueuedEvent[]>();
  private readonly drainingSockets = new Set<string>();

  constructor(@Optional() options?: BackpressureOptions) {
    this.maxWriteBufferPackets = options?.maxWriteBufferPackets ?? 250;
    this.maxBufferedBytes = options?.maxBufferedBytes ?? 1024 * 1024; // 1 MB
    this.dangerBufferedBytes = options?.dangerBufferedBytes ?? 5 * 1024 * 1024; // 5 MB
    this.maxQueuedCriticalEvents = options?.maxQueuedCriticalEvents ?? 100;
  }

  /**
   * Evaluates if a socket's TCP or Engine.IO buffer is currently congested.
   */
  isCongested(socket: Socket): boolean {
    const conn = (socket as unknown as { conn?: Record<string, unknown> })?.conn;
    if (!conn) return false;

    const writeBuffer = conn.writeBuffer as unknown[] | undefined;
    const writeBufferLen = writeBuffer?.length ?? 0;

    const transport = conn.transport as Record<string, unknown> | undefined;
    const transportSocket = (transport?.socket ??
      (transport?.ws as Record<string, unknown>)?._socket) as
      { bufferSize?: number; writableNeedDrain?: boolean } | undefined;

    const bufferSize = transportSocket?.bufferSize ?? 0;
    const needDrain = transportSocket?.writableNeedDrain ?? false;
    const wsBufferedAmount = Number(
      (transport?.ws as { bufferedAmount?: number })?.bufferedAmount ?? 0,
    );

    const totalBufferedBytes = Math.max(bufferSize, wsBufferedAmount);

    return (
      writeBufferLen > this.maxWriteBufferPackets ||
      totalBufferedBytes > this.maxBufferedBytes ||
      needDrain
    );
  }

  /**
   * Evaluates if a socket's buffer exceeds the critical danger ceiling (OOM hazard).
   */
  isDangerouslyCongested(socket: Socket): boolean {
    const conn = (socket as unknown as { conn?: Record<string, unknown> })?.conn;
    if (!conn) return false;

    const writeBuffer = conn.writeBuffer as unknown[] | undefined;
    const writeBufferLen = writeBuffer?.length ?? 0;

    const transport = conn.transport as Record<string, unknown> | undefined;
    const transportSocket = (transport?.socket ??
      (transport?.ws as Record<string, unknown>)?._socket) as { bufferSize?: number } | undefined;

    const bufferSize = transportSocket?.bufferSize ?? 0;
    const wsBufferedAmount = Number(
      (transport?.ws as { bufferedAmount?: number })?.bufferedAmount ?? 0,
    );
    const totalBufferedBytes = Math.max(bufferSize, wsBufferedAmount);

    return (
      writeBufferLen > this.maxWriteBufferPackets * 4 ||
      totalBufferedBytes > this.dangerBufferedBytes
    );
  }

  /**
   * Emits an event with backpressure awareness.
   * - Ephemeral events (typing, presence) are dropped when congested.
   * - Critical events (messages, deletions) are queued and flushed on `drain`.
   * - Sockets exceeding danger thresholds are cleanly disconnected to prevent OOM.
   */
  sendSafe(
    socket: Socket,
    event: string,
    payload: unknown,
    priority: EventPriority = 'critical',
  ): boolean {
    if (!socket || !socket.connected) {
      return false;
    }

    if (this.isDangerouslyCongested(socket)) {
      this.logger.warn(
        `Socket ${socket.id} severely congested (>5MB/1000 packets). Disconnecting slow client to prevent OOM.`,
      );
      this.cleanupSocket(socket.id);
      socket.disconnect(true);
      return false;
    }

    if (this.isCongested(socket)) {
      if (priority === 'ephemeral') {
        // Drop non-essential frames under TCP backpressure
        return false;
      }

      this.enqueueCriticalEvent(socket, event, payload);
      return true;
    }

    // Normal emission
    socket.emit(event, payload);
    return true;
  }

  cleanupSocket(socketId: string): void {
    this.socketQueues.delete(socketId);
    this.drainingSockets.delete(socketId);
  }

  private enqueueCriticalEvent(socket: Socket, event: string, payload: unknown): void {
    const socketId = socket.id;
    let queue = this.socketQueues.get(socketId);
    if (!queue) {
      queue = [];
      this.socketQueues.set(socketId, queue);
    }

    if (queue.length >= this.maxQueuedCriticalEvents) {
      // FIFO eviction to protect server memory bounds
      queue.shift();
    }
    queue.push({ event, payload });

    this.attachDrainListener(socket);
  }

  private attachDrainListener(socket: Socket): void {
    const socketId = socket.id;
    if (this.drainingSockets.has(socketId)) return;

    this.drainingSockets.add(socketId);

    const conn = (socket as unknown as { conn?: Record<string, unknown> })?.conn;
    const transport = conn?.transport as Record<string, unknown> | undefined;
    const transportSocket = (transport?.socket ??
      (transport?.ws as Record<string, unknown>)?._socket) as
      { once?: (e: string, cb: () => void) => void } | undefined;

    const onDrain = () => {
      this.drainingSockets.delete(socketId);
      if (!socket.connected) {
        this.cleanupSocket(socketId);
        return;
      }

      const queue = this.socketQueues.get(socketId);
      if (!queue || queue.length === 0) return;

      while (queue.length > 0 && !this.isCongested(socket)) {
        const item = queue.shift();
        if (item) {
          socket.emit(item.event, item.payload);
        }
      }

      if (queue.length > 0) {
        // Re-arm drain listener if still congested
        this.attachDrainListener(socket);
      } else {
        this.socketQueues.delete(socketId);
      }
    };

    if (
      conn &&
      typeof (conn as { once?: (e: string, cb: () => void) => void }).once === 'function'
    ) {
      (conn as { once: (e: string, cb: () => void) => void }).once('drain', onDrain);
    } else if (transportSocket && typeof transportSocket.once === 'function') {
      transportSocket.once('drain', onDrain);
    } else {
      setTimeout(onDrain, 50);
    }
  }

  onModuleInit(): void {
    this.logger.log('WsBackpressureService initialized');
  }

  onModuleDestroy(): void {
    this.socketQueues.clear();
    this.drainingSockets.clear();
  }
}
