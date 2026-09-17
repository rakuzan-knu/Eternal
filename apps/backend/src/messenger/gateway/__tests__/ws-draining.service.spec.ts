import { WsDrainingService } from '../ws-draining.service';
import { WS_EVENTS } from '../../events/ws-events';
import type { Server, Socket } from 'socket.io';

describe('WsDrainingService', () => {
  let service: WsDrainingService;

  beforeEach(() => {
    service = new WsDrainingService();
  });

  it('should initialize with isDraining = false', () => {
    expect(service.isDraining).toBe(false);
  });

  it('should handle undefined server gracefully', async () => {
    await expect(service.drainSockets(undefined)).resolves.not.toThrow();
  });

  it('should drain connected sockets with reconnect_with_backoff and jitter', async () => {
    const mockSocket1 = {
      id: 'sock-1',
      connected: true,
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    const mockSocket2 = {
      id: 'sock-2',
      connected: true,
      emit: jest.fn(),
      disconnect: jest.fn(),
    };

    const mockServer = {
      sockets: {
        sockets: new Map([
          ['sock-1', mockSocket1 as unknown as Socket],
          ['sock-2', mockSocket2 as unknown as Socket],
        ]),
      },
    };

    await service.drainSockets(mockServer as unknown as Server, {
      drainRatePerSec: 1000,
      minBackoffMs: 1000,
      maxBackoffMs: 5000,
    });

    expect(service.isDraining).toBe(true);

    const anyNumber: unknown = expect.any(Number);
    expect(mockSocket1.emit).toHaveBeenCalledWith(
      WS_EVENTS.RECONNECT_WITH_BACKOFF,
      expect.objectContaining({
        reconnectAfterMs: anyNumber,
        reason: 'server_shutdown',
      }),
    );
    expect(mockSocket1.disconnect).toHaveBeenCalledWith(true);

    expect(mockSocket2.emit).toHaveBeenCalledWith(
      WS_EVENTS.RECONNECT_WITH_BACKOFF,
      expect.objectContaining({
        reconnectAfterMs: anyNumber,
        reason: 'server_shutdown',
      }),
    );
    expect(mockSocket2.disconnect).toHaveBeenCalledWith(true);
  });
});
