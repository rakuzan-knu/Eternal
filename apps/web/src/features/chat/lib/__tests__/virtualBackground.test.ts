import { describe, it, expect, vi } from 'vitest';
import { VirtualBackgroundManager } from '../webrtc/virtualBackground';

describe('VirtualBackgroundManager', () => {
  it('instantiates and switches background modes', () => {
    const mockTrack = {
      kind: 'video',
      enabled: true,
      stop: vi.fn(),
    } as unknown as MediaStreamTrack;

    const manager = new VirtualBackgroundManager(mockTrack);
    expect(manager.getMode()).toBe('none');
    expect(manager.getProcessedTrack()).toBe(mockTrack);

    manager.setMode('blur');
    expect(manager.getMode()).toBe('blur');

    manager.setMode('office');
    expect(manager.getMode()).toBe('office');

    manager.setMode('none');
    expect(manager.getMode()).toBe('none');

    manager.destroy();
  });
});
