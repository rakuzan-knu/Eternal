import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpfsRecorder } from '../opfsRecorder';

describe('OpfsRecorder', () => {
  let mockWorker: {
    postMessage: ReturnType<typeof vi.fn>;
    terminate: ReturnType<typeof vi.fn>;
    onmessage: ((ev: MessageEvent) => void) | null;
    onerror: ((err: ErrorEvent) => void) | null;
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    mockWorker = {
      postMessage: vi.fn().mockImplementation((msg: { type: string }) => {
        if (msg.type === 'INIT') {
          setTimeout(() => {
            mockWorker.onmessage?.({
              data: { type: 'INITIALIZED' },
            } as MessageEvent);
          }, 0);
        } else if (msg.type === 'GET_FILE_BLOB') {
          setTimeout(() => {
            mockWorker.onmessage?.({
              data: {
                type: 'FILE_BLOB',
                blob: new Blob(['fake-4k-recording-stream'], { type: 'video/webm' }),
              },
            } as MessageEvent);
          }, 0);
        }
      }),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
    };

    // Mock Worker constructor
    vi.stubGlobal(
      'Worker',
      vi.fn().mockImplementation(() => mockWorker),
    );

    // Mock MediaRecorder
    class MockMediaRecorder {
      static isTypeSupported = vi.fn().mockReturnValue(true);
      state = 'inactive';
      ondataavailable: ((ev: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;

      start() {
        this.state = 'recording';
      }
      pause() {
        this.state = 'paused';
      }
      resume() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.onstop?.();
      }
    }

    vi.stubGlobal('MediaRecorder', MockMediaRecorder);
  });

  it('detects OPFS support in modern browsers', () => {
    // navigator.storage mock
    Object.defineProperty(navigator, 'storage', {
      value: { getDirectory: vi.fn() },
      configurable: true,
    });

    expect(OpfsRecorder.isSupported()).toBe(true);
  });

  it('records stream, pauses, resumes and retrieves finalized Blob from OPFS', async () => {
    const recorder = new OpfsRecorder();
    const mockTrack = { kind: 'video', stop: vi.fn() };
    const mockStream = {
      getTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream;

    await recorder.start(mockStream, { callId: 'test-call' });
    expect(recorder.getState()).toBe('recording');

    recorder.pause();
    expect(recorder.getState()).toBe('paused');

    recorder.resume();
    expect(recorder.getState()).toBe('recording');

    const blob = await recorder.stop();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
    expect(recorder.getState()).toBe('inactive');

    await recorder.cleanup();
  });
});
