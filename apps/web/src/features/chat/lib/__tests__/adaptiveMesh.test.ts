import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdaptiveMeshController } from '../webrtc/adaptiveMesh';

describe('AdaptiveMeshController', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      })),
    );
  });

  it('registers and unregisters elements and adjusts speaker priority without error', () => {
    const mockSender = {
      track: { kind: 'video' },
      getParameters: vi.fn().mockReturnValue({
        encodings: [{ active: true, maxBitrate: 1000000 }],
      }),
      setParameters: vi.fn().mockResolvedValue(undefined),
    };

    const mockPc = {
      getSenders: () => [mockSender],
    } as unknown as RTCPeerConnection;

    const controller = new AdaptiveMeshController(() => mockPc);
    expect(controller).toBeDefined();

    const mockEl = document.createElement('div');
    controller.registerElement('user-1', mockEl);
    controller.setActiveSpeaker('user-1');

    controller.unregisterElement('user-1');
    controller.destroy();
  });
});
