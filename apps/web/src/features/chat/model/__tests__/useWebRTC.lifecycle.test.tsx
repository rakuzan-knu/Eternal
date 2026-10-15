import { StrictMode, type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWebRTC } from '../useWebRTC';
import { useCallStore } from '../callStore';
import { apiClient } from '@/shared/api/httpClient';
vi.mock('../../lib/webrtc/localAudioPipeline', () => ({
  LocalAudioPipeline: class {
    destroy() {}
    getProcessedTrack() {
      return undefined;
    }
    setGateOpen() {}
  },
}));
vi.mock('@/shared/api/socket', () => ({
  getSocket: () => ({ on: vi.fn(), off: vi.fn(), emit: vi.fn() }),
}));
describe('WebRTC idle lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useCallStore.setState({ localStream: null, screenShareStream: null, remoteStreams: {} });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('releases engine timers across repeated StrictMode mounts without a call', () => {
    const baseline = vi.getTimerCount();
    for (let i = 0; i < 10; i++) {
      const { unmount } = renderHook(() => useWebRTC({}), {
        wrapper: ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>,
      });
      unmount();
    }
    expect(vi.getTimerCount()).toBe(baseline);
  });
  it.each(['unmount', 'close'] as const)(
    'stops microphone permission resolved after %s',
    async (action) => {
      let resolve!: (stream: MediaStream) => void;
      const pending = new Promise<MediaStream>((done) => {
        resolve = done;
      });
      const track = { kind: 'audio', readyState: 'live', stop: vi.fn() };
      const stream = {
        getTracks: () => [track],
        getAudioTracks: () => [track],
        getVideoTracks: () => [],
      } as unknown as MediaStream;
      vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(() => pending) } });
      vi.stubGlobal(
        'MediaStream',
        class {
          constructor(public tracks: MediaStreamTrack[]) {}
          getTracks() {
            return this.tracks;
          }
          getAudioTracks() {
            return this.tracks.filter((t) => t.kind === 'audio');
          }
          getVideoTracks() {
            return this.tracks.filter((t) => t.kind === 'video');
          }
        },
      );
      useCallStore.setState({ localStream: null });
      const { result, unmount } = renderHook(() => useWebRTC({}));
      const outcome = result.current.acquireLocalMedia('audio').catch((error: unknown) => error);
      if (action === 'unmount') unmount();
      else act(() => result.current.closeConnection());
      await act(async () => {
        resolve(stream);
        await outcome;
      });
      expect(await outcome).toMatchObject({ name: 'AbortError' });
      expect(track.stop).toHaveBeenCalledOnce();
      expect(useCallStore.getState().localStream).toBeNull();
      if (action === 'close') unmount();
    },
  );
  it('does not create a peer connection after a late ICE response', async () => {
    let resolve!: (value: unknown) => void;
    vi.spyOn(apiClient, 'get').mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }) as never,
    );
    const allocate = vi.fn(() => {
      throw new Error('Late PC allocation');
    });
    vi.stubGlobal('RTCPeerConnection', allocate);
    const { result, unmount } = renderHook(() => useWebRTC({}));
    const outcome = result.current.initPeerConnection(() => {}).catch((error: unknown) => error);
    unmount();
    resolve({ data: { iceServers: [] } });
    expect(await outcome).toMatchObject({ name: 'AbortError' });
    expect(allocate).not.toHaveBeenCalled();
  });
  it.each(['camera', 'screen'] as const)('stops late %s capture after unmount', async (kind) => {
    let resolve!: (stream: MediaStream) => void;
    const pending = new Promise<MediaStream>((done) => {
      resolve = done;
    });
    const track = {
      kind: 'video',
      stop: vi.fn(),
      applyConstraints: vi.fn().mockResolvedValue(undefined),
    };
    const stream = {
      getTracks: () => [track],
      getAudioTracks: () => [],
      getVideoTracks: () => [track],
    } as unknown as MediaStream;
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: () => pending, getDisplayMedia: () => pending },
    });
    const { result, unmount } = renderHook(() => useWebRTC({}));
    const outcome = (
      kind === 'camera' ? result.current.toggleVideoTrack(false) : result.current.startScreenShare()
    ).catch((error: unknown) => error);
    unmount();
    await act(async () => {
      resolve(stream);
      await outcome;
    });
    expect(track.stop).toHaveBeenCalledOnce();
    expect(useCallStore.getState().localStream).toBeNull();
    expect(useCallStore.getState().screenShareStream).toBeNull();
  });
  it('stops an unpublished screen stream when track replacement rejects after close', async () => {
    let reject!: (error: Error) => void;
    const replacement = new Promise<void>((_, fail) => {
      reject = fail;
    });
    const sender = {
      track: { kind: 'video', stop: vi.fn() },
      replaceTrack: vi.fn(() => replacement),
    };
    const pc = {
      getSenders: () => [sender],
      getReceivers: () => [],
      getTransceivers: () => [],
      getStats: async () => new Map(),
      close: vi.fn(),
    };
    vi.stubGlobal(
      'RTCPeerConnection',
      vi.fn(function () {
        return pc;
      }),
    );
    vi.stubGlobal('RTCRtpReceiver', { getCapabilities: () => ({ codecs: [] }) });
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce({ data: { iceServers: [] } } as never);
    const track = {
      kind: 'video',
      stop: vi.fn(),
      applyConstraints: vi.fn().mockResolvedValue(undefined),
    };
    const stream = {
      getTracks: () => [track],
      getAudioTracks: () => [],
      getVideoTracks: () => [track],
    };
    vi.stubGlobal('navigator', { mediaDevices: { getDisplayMedia: async () => stream } });
    const { result, unmount } = renderHook(() => useWebRTC({}));
    await act(async () => {
      await result.current.initPeerConnection(() => {});
    });
    const outcome = result.current.startScreenShare().catch((error: unknown) => error);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(sender.replaceTrack).toHaveBeenCalledOnce();
    act(() => result.current.closeConnection());
    reject(new DOMException('Connection closed', 'InvalidStateError'));
    expect(await outcome).toMatchObject({ name: 'AbortError' });
    expect(track.stop).toHaveBeenCalledOnce();
    expect(useCallStore.getState().screenShareStream).toBeNull();
    unmount();
  });
});
