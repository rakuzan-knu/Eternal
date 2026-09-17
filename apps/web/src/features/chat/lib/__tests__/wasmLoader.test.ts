import { describe, it, expect, beforeEach } from 'vitest';
import { wasmLoader } from '../webrtc/wasmLoader';

describe('wasmLoader (Web Vitals Event-Driven Lazy Loading)', () => {
  beforeEach(() => {
    wasmLoader.reset();
  });

  it('initializes all modules in idle state without loading binaries', () => {
    expect(wasmLoader.getStatus('rnnoise').status).toBe('idle');
    expect(wasmLoader.getStatus('mediapipe').status).toBe('idle');
    expect(wasmLoader.getStatus('whisper').status).toBe('idle');
  });

  it('loads MediaPipe only on demand and transitions state to ready', async () => {
    let capturedState = wasmLoader.getStatus('mediapipe');
    const unsubscribe = wasmLoader.subscribe('mediapipe', (state) => {
      capturedState = state;
    });

    const loadPromise = wasmLoader.loadMediaPipe();
    const success = await loadPromise;

    expect(success).toBe(true);
    expect(capturedState.status).toBe('ready');
    expect(capturedState.progressPercent).toBe(100);
    expect(capturedState.loadedAt).not.toBeNull();

    unsubscribe();
  });

  it('loads Whisper transcription WASM on demand and caches ready status', async () => {
    const success1 = await wasmLoader.loadWhisper();
    expect(success1).toBe(true);
    expect(wasmLoader.getStatus('whisper').status).toBe('ready');

    // Second call returns immediately because already cached
    const success2 = await wasmLoader.loadWhisper();
    expect(success2).toBe(true);
  });
});
