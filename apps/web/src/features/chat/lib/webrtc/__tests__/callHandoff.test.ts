import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCallHandoff } from '../../../model/useCallHandoff';
import { useCallStore } from '../../../model/callStore';
import { getSocket } from '@/shared/api/socket';
import { WS_EVENTS } from '@backend/messenger/events/ws-events';

vi.mock('@/shared/api/socket', () => ({
  getSocket: vi.fn(),
}));

interface MockSocket {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
}

describe('useCallHandoff', () => {
  let mockSocket: MockSocket;
  let eventHandlers: Record<string, (...args: unknown[]) => void>;

  beforeEach(() => {
    useCallStore.getState().resetCall();
    eventHandlers = {};

    mockSocket = {
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        eventHandlers[event] = handler;
      }),
      off: vi.fn((event: string) => {
        delete eventHandlers[event];
      }),
      emit: vi.fn(),
    };

    vi.mocked(getSocket).mockReturnValue(mockSocket as unknown as ReturnType<typeof getSocket>);
  });

  it('receives handoff announcement when another device is in call', () => {
    const { result } = renderHook(() => useCallHandoff());

    expect(result.current.remoteCall).toBeNull();

    act(() => {
      eventHandlers[WS_EVENTS.CALL_HANDOFF_ANNOUNCE]?.({
        callId: 'call-xyz-123',
        conversationId: 'conv-456',
        type: 'video',
      });
    });

    expect(result.current.remoteCall).toEqual({
      callId: 'call-xyz-123',
      conversationId: 'conv-456',
      type: 'video',
    });
  });

  it('requests handoff successfully and updates callStore', async () => {
    const { result } = renderHook(() => useCallHandoff());

    act(() => {
      eventHandlers[WS_EVENTS.CALL_HANDOFF_ANNOUNCE]?.({
        callId: 'call-100',
        conversationId: 'conv-100',
      });
    });

    mockSocket.emit.mockImplementation(
      (event: string, _payload: unknown, callback: (res: unknown) => void) => {
        if (event === WS_EVENTS.CALL_HANDOFF_REQUEST) {
          callback({
            status: 'ok',
            call: {
              id: 'call-100',
              conversationId: 'conv-100',
              type: 'AUDIO',
              status: 'CONNECTED',
              participants: [],
            },
          });
        }
      },
    );

    let success = false;
    await act(async () => {
      success = await result.current.requestHandoff('call-100');
    });

    expect(success).toBe(true);
    expect(useCallStore.getState().callId).toBe('call-100');
    expect(useCallStore.getState().callStatus).toBe('calling');
  });

  it('handles remote handoff complete by gracefully disconnecting', () => {
    useCallStore.getState().setActiveCall({
      id: 'call-current',
      conversationId: 'conv-abc',
      type: 'AUDIO' as any,
      status: 'CONNECTED' as any,
      participants: [],
    } as any);
    useCallStore.getState().setCallStatus('connected');

    const { result } = renderHook(() => useCallHandoff());

    act(() => {
      eventHandlers[WS_EVENTS.CALL_HANDOFF_COMPLETE]?.({
        callId: 'call-current',
        reason: 'HANDED_OFF_TO_ANOTHER_DEVICE',
      });
    });

    expect(useCallStore.getState().callStatus).toBe('idle');
    expect(useCallStore.getState().callId).toBeNull();
    expect(result.current.transferError).toContain('Call transferred to your other device');
  });

  it('allows dismissing the handoff banner', () => {
    const { result } = renderHook(() => useCallHandoff());

    act(() => {
      eventHandlers[WS_EVENTS.CALL_HANDOFF_ANNOUNCE]?.({
        callId: 'call-200',
        conversationId: 'conv-200',
      });
    });
    expect(result.current.remoteCall).not.toBeNull();

    act(() => {
      result.current.dismissHandoff();
    });
    expect(result.current.remoteCall).toBeNull();
  });
});
