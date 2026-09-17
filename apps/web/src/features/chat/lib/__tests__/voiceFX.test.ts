import { describe, it, expect, vi } from 'vitest';
import { VoiceFXProcessor } from '../webrtc/voiceFX';

describe('VoiceFXProcessor', () => {
  it('instantiates cleanly and switches through modes without throwing', () => {
    const mockTrack = {
      kind: 'audio',
      enabled: true,
      stop: vi.fn(),
    } as unknown as MediaStreamTrack;

    const processor = new VoiceFXProcessor(mockTrack);
    expect(processor.getProcessedTrack()).toBeDefined();
    expect(processor.getMode()).toBe('none');

    processor.setMode('robot');
    expect(processor.getMode()).toBe('robot');

    processor.setMode('radio');
    expect(processor.getMode()).toBe('radio');

    processor.setMode('deep');
    expect(processor.getMode()).toBe('deep');

    processor.setMode('cosmic');
    expect(processor.getMode()).toBe('cosmic');

    processor.setMode('none');
    expect(processor.getMode()).toBe('none');

    processor.destroy();
  });
});
