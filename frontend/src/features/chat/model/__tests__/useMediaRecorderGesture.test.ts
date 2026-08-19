import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useMediaRecorderGesture,
  getSupportedAudioMimeType,
  getSupportedVideoMimeType,
} from '../useMediaRecorderGesture';

describe('useMediaRecorderGesture', () => {
  it('defaults to voice mode and idle record state', () => {
    const onSend = vi.fn();
    const { result } = renderHook(() => useMediaRecorderGesture({ onSend }));

    expect(result.current.mode).toBe('voice');
    expect(result.current.recordState).toBe('idle');
  });

  it('switches mode between voice and video on quick pointer release (<300ms)', () => {
    const onSend = vi.fn();
    const { result } = renderHook(() => useMediaRecorderGesture({ onSend }));

    act(() => {
      result.current.handlePointerDown({ clientX: 100, clientY: 100 } as React.PointerEvent);
    });

    // Release immediately (before 300ms)
    act(() => {
      result.current.handlePointerUp();
    });

    expect(result.current.mode).toBe('video');
    expect(result.current.modeToast).toEqual({
      text: 'Hold to record video. Click to switch to audio.',
      isFading: false,
    });

    // Click again to switch back to voice
    act(() => {
      result.current.handlePointerDown({ clientX: 100, clientY: 100 } as React.PointerEvent);
      result.current.handlePointerUp();
    });

    expect(result.current.mode).toBe('voice');
    expect(result.current.modeToast).toEqual({
      text: 'Hold to record audio. Click to switch to video.',
      isFading: false,
    });
  });

  it('switches camera and triggers cameraToast', () => {
    const onSend = vi.fn();
    const { result } = renderHook(() => useMediaRecorderGesture({ onSend }));

    act(() => {
      result.current.switchCamera();
    });

    expect(result.current.cameraToast).toEqual({
      text: 'Back Camera',
      isFading: false,
    });

    act(() => {
      result.current.switchCamera();
    });

    expect(result.current.cameraToast).toEqual({
      text: 'Front Camera',
      isFading: false,
    });
  });

  it('supports mime type fallback functions', () => {
    const audioMime = getSupportedAudioMimeType();
    const videoMime = getSupportedVideoMimeType();
    expect(typeof audioMime).toBe('string');
    expect(typeof videoMime).toBe('string');
  });
});
