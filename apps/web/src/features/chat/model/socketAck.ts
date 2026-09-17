import type { AckResponse } from './chatSocketTypes';

/**
 * Minimal socket surface needed for acked emits. Structural (not the full
 * `Socket` type) so it stays mockable in tests and agnostic of transports.
 */
export interface AckSocket {
  emit(event: string, payload: object, ack?: (res: AckResponse<any>) => void): unknown;
}

/**
 * Enterprise Socket.io emit-with-ack.
 *
 * - Resolves with the server ack on `status: 'ok'`.
 * - REJECTS on `status: 'error'`, missing ack, or timeout — callers MUST
 *   treat timeout as failure (REST fallback or FAILED marking). Resolving
 *   timeout as success strands optimistic rows in `pending` forever.
 */
export function emitWithAck<T = unknown>(
  socket: AckSocket,
  event: string,
  payload: object,
  timeoutMs = 6000,
): Promise<AckResponse<T>> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`${event} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      socket.emit(event, payload, (res: AckResponse<T>) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        if (!res || res.status === 'error') {
          reject(new Error(res?.error ?? `${event} failed`));
          return;
        }
        resolve(res);
      });
    } catch (err) {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      reject(err instanceof Error ? err : new Error(`${event} emit failed`));
    }
  });
}
