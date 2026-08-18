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

    // Click again to switch back to voice
    act(() => {
      result.current.handlePointerDown({ clientX: 100, clientY: 100 } as React.PointerEvent);
      result.current.handlePointerUp();
    });

    expect(result.current.mode).toBe('voice');
  });

  it('supports mime type fallback functions', () => {
    const audioMime = getSupportedAudioMimeType();
    const videoMime = getSupportedVideoMimeType();
    expect(typeof audioMime).toBe('string');
    expect(typeof videoMime).toBe('string');
  });
});
