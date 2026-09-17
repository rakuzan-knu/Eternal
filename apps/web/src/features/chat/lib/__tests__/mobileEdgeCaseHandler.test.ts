import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MobileEdgeCaseHandler } from '../webrtc/mobileEdgeCaseHandler';

describe('MobileEdgeCaseHandler', () => {
  let handler: MobileEdgeCaseHandler;
  let onAutoplayBlocked: ReturnType<typeof vi.fn>;
  let onCameraVisibilityChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onAutoplayBlocked = vi.fn();
    onCameraVisibilityChange = vi.fn();

    handler = new MobileEdgeCaseHandler({
      onAutoplayBlocked,
      onCameraVisibilityChange,
    });
  });

  afterEach(() => {
    handler.destroy();
  });

  it('detects and flags NotAllowedError when element autoplay fails', async () => {
    const mockElement = {
      play: vi.fn().mockRejectedValue({ name: 'NotAllowedError' }),
    } as unknown as HTMLMediaElement;

    handler.registerMediaElement(mockElement);

    // Wait for promise rejection to propagate
    await Promise.resolve();

    expect(handler.getIsAutoplayBlocked()).toBe(true);
    expect(onAutoplayBlocked).toHaveBeenCalledWith(true);
  });

  it('unblocks autoplay by resuming AudioContext and calling play()', async () => {
    const mockAudioContext = {
      state: 'suspended',
      resume: vi.fn().mockResolvedValue(undefined),
    } as unknown as AudioContext;

    const mockElement = {
      play: vi.fn().mockResolvedValue(undefined),
    } as unknown as HTMLMediaElement;

    handler.registerAudioContext(mockAudioContext);
    handler.registerMediaElement(mockElement);

    const success = await handler.unblockAutoplay();

    expect(success).toBe(true);
    expect(mockAudioContext.resume).toHaveBeenCalled();
    expect(mockElement.play).toHaveBeenCalled();
    expect(handler.getIsAutoplayBlocked()).toBe(false);
  });

  it('handles setSinkId on supported audio output elements', async () => {
    const mockSetSinkId = vi.fn().mockResolvedValue(undefined);
    const mockElement = {
      setSinkId: mockSetSinkId,
    } as unknown as HTMLMediaElement;

    const result = await handler.setAudioOutputDevice(mockElement, 'airpods-sink-id');
    expect(result).toBe(true);
    expect(mockSetSinkId).toHaveBeenCalledWith('airpods-sink-id');
  });

  it('handles setSinkId absence gracefully', async () => {
    const mockElement = {} as HTMLMediaElement;
    const result = await handler.setAudioOutputDevice(mockElement, 'test-id');
    expect(result).toBe(false);
  });
});
