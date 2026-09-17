import { describe, expect, it, vi } from 'vitest';
import { rnnoiseManager } from '../rnnoise/rnnoiseManager';

describe('rnnoiseManager', () => {
  it('returns stream handle and setDenoiseEnabled function', async () => {
    const mockTrack = {
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaStreamTrack;

    const mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([mockTrack]),
      getVideoTracks: vi.fn().mockReturnValue([]),
      getTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    const handle = await rnnoiseManager.createDenoisedStream(mockStream, true);

    expect(handle).toBeDefined();
    expect(typeof handle.setDenoiseEnabled).toBe('function');
    expect(typeof handle.destroy).toBe('function');

    handle.setDenoiseEnabled(false);
    handle.destroy();
  });

  it('handles streams without audio tracks gracefully', async () => {
    const emptyStream = {
      getAudioTracks: vi.fn().mockReturnValue([]),
      getVideoTracks: vi.fn().mockReturnValue([]),
      getTracks: vi.fn().mockReturnValue([]),
    } as unknown as MediaStream;

    const handle = await rnnoiseManager.createDenoisedStream(emptyStream);
    expect(handle.cleanStream).toBe(emptyStream);
  });

  it('connects to AudioWorkletNode when audio worklet is supported', async () => {
    const postMessageMock = vi.fn();
    const disconnectMock = vi.fn();
    const connectMock = vi.fn();

    class MockAudioWorkletNode {
      port = { postMessage: postMessageMock };
      connect = connectMock;
      disconnect = disconnectMock;
    }

    class MockAudioContext {
      state = 'running';
      audioWorklet = {
        addModule: vi.fn().mockResolvedValue(undefined),
      };
      createMediaStreamSource = vi.fn().mockReturnValue({ connect: vi.fn(), disconnect: vi.fn() });
      createMediaStreamDestination = vi.fn().mockReturnValue({
        stream: {
          getAudioTracks: () => [
            {
              enabled: true,
              stop: vi.fn(),
            },
          ],
        },
      });
      resume = vi.fn().mockResolvedValue(undefined);
    }

    class MockMediaStream {
      constructor(public tracks: any[] = []) {}
      getAudioTracks() {
        return this.tracks;
      }
      getVideoTracks() {
        return [];
      }
    }

    vi.stubGlobal('MediaStream', MockMediaStream);
    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode);

    const mockTrack = {
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaStreamTrack;

    const mockStream = {
      getAudioTracks: vi.fn().mockReturnValue([mockTrack]),
      getVideoTracks: vi.fn().mockReturnValue([]),
      getTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    const handle = await rnnoiseManager.createDenoisedStream(mockStream, true);
    expect(handle).toBeDefined();

    handle.setDenoiseEnabled(false);
    expect(postMessageMock).toHaveBeenCalledWith({ type: 'setDenoiseEnabled', enabled: false });

    handle.destroy();
    vi.unstubAllGlobals();
  });
});
