import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMediaRecorderGesture,
  getSupportedAudioMimeType,
  getSupportedVideoMimeType,
} from '../useMediaRecorderGesture';

describe('useMediaRecorderGesture (Comprehensive Suite)', () => {
  let mockStream: MediaStream;
  let mockTrack: MediaStreamTrack;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockTrack = {
      stop: vi.fn(),
      kind: 'audio',
    } as unknown as MediaStreamTrack;

    mockStream = {
      getTracks: vi.fn(() => [mockTrack]),
    } as unknown as MediaStream;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'videoinput', deviceId: 'cam-1', label: 'Front Camera' },
          { kind: 'videoinput', deviceId: 'cam-2', label: 'Back Camera' },
        ]),
      },
      writable: true,
      configurable: true,
    });

    global.MediaRecorder = class {
      static isTypeSupported = vi.fn(() => true);
      state = 'recording';
      ondataavailable: ((e: any) => void) | null = null;
      onstop: (() => void) | null = null;
      start = vi.fn();
      stop = vi.fn(() => {
        this.state = 'inactive';
        this.onstop?.();
      });
    } as unknown as typeof MediaRecorder;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('detects supported audio and video mime types', () => {
    expect(getSupportedAudioMimeType()).toBeTruthy();
    expect(getSupportedVideoMimeType()).toBeTruthy();
  });

  it('toggles mode from voice to video on quick pointer click', () => {
    const onSend = vi.fn();
    const { result } = renderHook(() => useMediaRecorderGesture({ onSend }));

    expect(result.current.mode).toBe('voice');

    // Pointer down
    act(() => {
      result.current.handlePointerDown({ clientX: 100, clientY: 100 } as any);
    });

    // Pointer up before 300ms hold threshold
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.handlePointerUp();
    });

    expect(result.current.mode).toBe('video');
    expect(result.current.modeToast?.text).toContain('Hold to record video');
  });

  it('starts recording on holding pointer for > 300ms', async () => {
    const onSend = vi.fn();
    const { result } = renderHook(() => useMediaRecorderGesture({ onSend }));

    act(() => {
      result.current.handlePointerDown({ clientX: 100, clientY: 100 } as any);
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.recordState).toBe('recording');
  });

  it('cancels and discards recording when sliding left by > 80px', async () => {
    const onSend = vi.fn();
    const { result } = renderHook(() => useMediaRecorderGesture({ onSend }));

    act(() => {
      result.current.handlePointerDown({ clientX: 200, clientY: 200 } as any);
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Slide left 100px (200 -> 100)
    act(() => {
      result.current.handlePointerMove({ clientX: 100, clientY: 200 } as any);
    });

    expect(result.current.recordState).toBe('idle');
    expect(result.current.duration).toBe(0);
  });

  it('locks recording when sliding up by > 60px', async () => {
    const onSend = vi.fn();
    const { result } = renderHook(() => useMediaRecorderGesture({ onSend }));

    act(() => {
      result.current.handlePointerDown({ clientX: 200, clientY: 200 } as any);
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Slide up 80px (200 -> 120)
    act(() => {
      result.current.handlePointerMove({ clientX: 200, clientY: 120 } as any);
    });

    expect(result.current.recordState).toBe('locked');
  });

  it('toggles camera facing mode when in video mode', () => {
    const onSend = vi.fn();
    const { result } = renderHook(() => useMediaRecorderGesture({ onSend }));

    // Switch to video mode first
    act(() => {
      result.current.handlePointerDown({ clientX: 100, clientY: 100 } as any);
    });
    act(() => {
      vi.advanceTimersByTime(100);
      result.current.handlePointerUp();
    });
    expect(result.current.mode).toBe('video');

    expect(result.current.facingMode).toBe('user');

    act(() => {
      result.current.toggleFacingMode();
    });

    expect(result.current.facingMode).toBe('environment');
  });

  it('stops and sends recording on handlePointerUp when actively recording', async () => {
    const onSend = vi.fn();
    const { result } = renderHook(() => useMediaRecorderGesture({ onSend }));

    act(() => {
      result.current.handlePointerDown({ clientX: 100, clientY: 100 } as any);
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.recordState).toBe('recording');

    act(() => {
      result.current.handlePointerUp();
    });
  });

  it('switches camera facing mode and restarts stream while actively recording video', async () => {
    const onSend = vi.fn();
    const { result } = renderHook(() => useMediaRecorderGesture({ onSend }));

    // Switch to video mode
    act(() => {
      result.current.setMode('video');
    });

    act(() => {
      result.current.handlePointerDown({ clientX: 100, clientY: 100 } as any);
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.recordState).toBe('recording');

    // Switch camera while recording
    act(() => {
      result.current.toggleFacingMode();
    });
  });

  it('stops recording to preview state and switches camera to specific deviceId', async () => {
    const onSend = vi.fn();
    const { result } = renderHook(() => useMediaRecorderGesture({ onSend }));

    // Start recording
    act(() => {
      result.current.handlePointerDown({ clientX: 100, clientY: 100 } as any);
    });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Lock recording
    act(() => {
      result.current.handlePointerMove({ clientX: 100, clientY: 20 } as any);
    });
    expect(result.current.recordState).toBe('locked');

    // Switch camera with specific deviceId
    act(() => {
      result.current.switchCamera('cam-2');
    });

    // Stop to preview
    act(() => {
      result.current.stopToPreview();
    });

    expect(result.current.recordState).toBe('preview');
    expect(result.current.previewPayload).not.toBeNull();
  });
});
