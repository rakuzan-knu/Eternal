import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DualCameraManager } from '../dualCameraManager';

describe('DualCameraManager', () => {
  let mockCanvasCtx: any;
  let mockCanvas: any;
  let mockSecondaryTrack: any;
  let mockSecondaryStream: any;
  let mockPrimaryTrack: any;
  let mockPrimaryStream: any;

  beforeEach(() => {
    mockCanvasCtx = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      clip: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    };

    mockSecondaryTrack = {
      kind: 'video',
      stop: vi.fn(),
    };

    mockSecondaryStream = {
      getVideoTracks: vi.fn().mockReturnValue([mockSecondaryTrack]),
      getTracks: vi.fn().mockReturnValue([mockSecondaryTrack]),
    };

    mockPrimaryTrack = {
      kind: 'video',
      stop: vi.fn(),
    };

    mockPrimaryStream = {
      getVideoTracks: vi.fn().mockReturnValue([mockPrimaryTrack]),
      getTracks: vi.fn().mockReturnValue([mockPrimaryTrack]),
    };

    const mockCompositeTrack = { kind: 'video', stop: vi.fn() };
    const mockCompositeStream = {
      getVideoTracks: vi.fn().mockReturnValue([mockCompositeTrack]),
      getTracks: vi.fn().mockReturnValue([mockCompositeTrack]),
    };

    mockCanvas = {
      width: 1280,
      height: 720,
      getContext: vi.fn().mockReturnValue(mockCanvasCtx),
      captureStream: vi.fn().mockReturnValue(mockCompositeStream),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') return mockCanvas as any;
      if (tagName === 'video') {
        return {
          play: vi.fn().mockResolvedValue(undefined),
          pause: vi.fn(),
          readyState: 4,
          srcObject: null,
        } as any;
      }
      return {} as any;
    });

    (globalThis as any).navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(mockSecondaryStream),
    };

    (globalThis as any).requestAnimationFrame = vi.fn().mockReturnValue(123);
    (globalThis as any).cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts dual camera mode and produces a composite video track', async () => {
    const manager = new DualCameraManager();
    let activeState = false;
    manager.subscribe((active) => {
      activeState = active;
    });

    const compositeTrack = await manager.startDualCamera(
      mockPrimaryStream as any,
      'sec-cam-id-1',
      'pip',
    );

    expect(compositeTrack).toBeDefined();
    expect(manager.getIsActive()).toBe(true);
    expect(activeState).toBe(true);
    expect(manager.getLayout()).toBe('pip');

    manager.stopDualCamera();
  });

  it('allows switching layout between pip and side_by_side', () => {
    const manager = new DualCameraManager();
    expect(manager.getLayout()).toBe('pip');

    manager.setLayout('side_by_side');
    expect(manager.getLayout()).toBe('side_by_side');
  });

  it('stops dual camera and cleans up tracks and animation frame', async () => {
    const manager = new DualCameraManager();
    await manager.startDualCamera(mockPrimaryStream as any, 'sec-cam-id-2', 'side_by_side');

    expect(manager.getIsActive()).toBe(true);

    manager.stopDualCamera();

    expect(manager.getIsActive()).toBe(false);
    expect(mockSecondaryTrack.stop).toHaveBeenCalled();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(123);
  });

  it('generates pairing URL with callId', () => {
    const manager = new DualCameraManager();
    const url = manager.getPairingUrl('call-xyz-999');
    expect(url).toContain('callId=call-xyz-999');
    expect(url).toContain('device=camera');
  });
});
