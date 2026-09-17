import { describe, it, expect, vi } from 'vitest';
import { emitWithAck, type AckSocket } from '../socketAck';

function fakeSocket(
  behavior: (event: string, payload: object, cb: (res: unknown) => void) => void,
): AckSocket {
  return {
    emit: (event: string, payload: object, ack?: (res: unknown) => void) => {
      behavior(event, payload, (res: unknown) => ack?.(res));
      return true;
    },
  } as AckSocket;
}

describe('emitWithAck', () => {
  it('resolves on status ok with payload', async () => {
    const socket = fakeSocket((_e, _p, cb) => cb({ status: 'ok', message: { id: 'm1' } }));
    const res = await emitWithAck<{ id: string }>(socket, 'sendMessage', { text: 'hi' });
    expect(res.status).toBe('ok');
    expect(res.message).toEqual({ id: 'm1' });
  });

  it('rejects on status error', async () => {
    const socket = fakeSocket((_e, _p, cb) => cb({ status: 'error', error: 'denied' }));
    await expect(emitWithAck(socket, 'sendMessage', {})).rejects.toThrow('denied');
  });

  it('rejects on timeout instead of resolving phantom success', async () => {
    vi.useFakeTimers();
    const socket = fakeSocket(() => {
      // never ack
    });
    const promise = emitWithAck(socket, 'sendMessage', {}, 1000);
    const assertion = expect(promise).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    vi.useRealTimers();
  });

  it('ignores late acks after timeout settled', async () => {
    vi.useFakeTimers();
    let lateCb: ((res: unknown) => void) | undefined;
    const socket = fakeSocket((_e, _p, cb) => {
      lateCb = cb;
    });
    const promise = emitWithAck(socket, 'sendMessage', {}, 500);
    const assertion = expect(promise).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(500);
    await assertion;
    // Late server ack must not unhandled-reject or resolve.
    lateCb?.({ status: 'ok' });
    vi.useRealTimers();
  });
});
