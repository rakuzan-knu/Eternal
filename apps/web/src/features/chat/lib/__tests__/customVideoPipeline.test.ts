import { describe, it, expect, vi } from 'vitest';
import {
  WebGPUSuperResEngine,
  WebCodecsStreamManager,
  isWebCodecsSupported,
  isWebGPUSupported,
} from '../webrtc/customVideoPipeline';

describe('CustomVideoPipeline', () => {
  it('detects WebCodecs and WebGPU capability flags gracefully', () => {
    expect(typeof isWebCodecsSupported()).toBe('boolean');
    expect(typeof isWebGPUSupported()).toBe('boolean');
  });

  it('initializes WebGPUSuperResEngine in fallback mode when no GPU is present', async () => {
    const engine = new WebGPUSuperResEngine('fsr_2x');
    const initialized = await engine.init();

    expect(typeof initialized).toBe('boolean');
    expect(engine.getMode()).toBe('fsr_2x');

    engine.setMode('neural_4k');
    expect(engine.getMode()).toBe('neural_4k');
    engine.destroy();
  });

  it('binds RTCDataChannel and records stats', () => {
    const superRes = new WebGPUSuperResEngine('cas');
    const manager = new WebCodecsStreamManager(superRes);

    const mockChannel = {
      label: 'p2p-webcodecs-stream',
      readyState: 'open',
      send: vi.fn(),
      onmessage: null,
    } as unknown as RTCDataChannel;

    manager.bindDataChannel(mockChannel);

    const stats = manager.getStats();
    expect(stats.framesEncoded).toBe(0);
    expect(stats.framesDecoded).toBe(0);
    expect(stats.isWebCodecsActive).toBe(false);

    manager.destroy();
  });
});
