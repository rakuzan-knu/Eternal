import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncPlayEngine } from '../webrtc/syncPlayEngine';

class MockDataChannel {
  label = 'p2p-syncplay';
  readyState: 'connecting' | 'open' | 'closing' | 'closed' = 'open';
  sentData: string[] = [];
  onmessage: ((event: { data: string }) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;

  send(data: string) {
    this.sentData.push(data);
  }

  simulateReceive(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

describe('SyncPlayEngine', () => {
  let engine: SyncPlayEngine;
  let mockChannel: MockDataChannel;

  beforeEach(() => {
    mockChannel = new MockDataChannel();
    engine = new SyncPlayEngine();
  });

  it('calculates NTP clock offset correctly', () => {
    // t0 = 1000, remote receives at t1 = 1050, remote sends pong at t2 = 1055, client receives at t3 = 1115
    // rtt = 1115 - 1000 - (1055 - 1050) = 115 - 5 = 110ms
    // offset = ((1050 - 1000) + (1055 - 1115)) / 2 = (50 + -60) / 2 = -5ms
    const result = engine.calculateNTPOffset(1000, 1050, 1055, 1115);
    expect(result.rtt).toBe(110);
    expect(result.offset).toBe(-5);
  });

  it('sends PLAY state with timestamp and current position', () => {
    engine.bindDataChannel(mockChannel as unknown as RTCDataChannel);

    const mockVideo = {
      currentTime: 42.5,
      paused: false,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      playbackRate: 1.0,
    } as unknown as HTMLVideoElement;

    engine.attachVideo(mockVideo);
    mockChannel.sentData = []; // clear initial ping

    engine.notifyPlay();

    expect(mockChannel.sentData.length).toBe(1);
    const sent = JSON.parse(mockChannel.sentData[0]!);
    expect(sent.type).toBe('PLAY');
    expect(sent.currentTime).toBe(42.5);
    expect(sent.isPlaying).toBe(true);
  });

  it('applies remote pause to attached video', () => {
    engine.bindDataChannel(mockChannel as unknown as RTCDataChannel);

    const pauseMock = vi.fn();
    const mockVideo = {
      currentTime: 10.0,
      paused: false,
      pause: pauseMock,
      playbackRate: 1.0,
    } as unknown as HTMLVideoElement;

    engine.attachVideo(mockVideo);

    mockChannel.simulateReceive({
      type: 'PAUSE',
      currentTime: 15.2,
      isPlaying: false,
      sentAt: Date.now(),
    });

    expect(mockVideo.currentTime).toBe(15.2);
    expect(pauseMock).toHaveBeenCalled();
  });

  it('notifies source change via callback', () => {
    const onSourceChange = vi.fn();
    const sync = new SyncPlayEngine({ onSourceChange });
    sync.bindDataChannel(mockChannel as unknown as RTCDataChannel);

    mockChannel.simulateReceive({
      type: 'SOURCE_CHANGE',
      sourceUrl:
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      sourceTitle: 'Big Buck Bunny',
      currentTime: 0,
      isPlaying: false,
      sentAt: Date.now(),
    });

    expect(onSourceChange).toHaveBeenCalledWith(
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      'Big Buck Bunny',
    );
  });
});
