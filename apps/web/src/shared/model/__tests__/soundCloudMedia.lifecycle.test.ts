import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hls = vi.hoisted(() => ({
  instances: [] as Array<{
    config: Record<string, unknown>;
    destroy: ReturnType<typeof vi.fn>;
    stopLoad: ReturnType<typeof vi.fn>;
    startLoad: ReturnType<typeof vi.fn>;
    events: Map<string, (event?: string, data?: { type: string; fatal?: boolean }) => void>;
  }>,
  failAttach: false,
}));
vi.mock('hls.js', () => ({
  default: class {
    static isSupported() {
      return true;
    }
    static Events = { MANIFEST_PARSED: 'manifest', ERROR: 'error' };
    static ErrorTypes = { NETWORK_ERROR: 'network', MEDIA_ERROR: 'media' };
    destroy = vi.fn();
    stopLoad = vi.fn();
    startLoad = vi.fn();
    events = new Map<string, (event?: string, data?: { type: string; fatal?: boolean }) => void>();
    constructor(public config: Record<string, unknown>) {
      hls.instances.push(this);
    }
    loadSource() {}
    attachMedia() {
      if (hls.failAttach) throw new Error('failed media attachment');
    }
    on(name: string, callback: () => void) {
      this.events.set(name, callback);
    }
  },
}));
vi.mock('@/shared/api/integrationsApi', () => ({
  integrationsApi: {
    getSpotifyQueue: vi.fn().mockResolvedValue({ tracks: [] }),
    getSoundCloudStream: vi.fn(),
  },
}));
vi.mock('@/shared/api/idbPersister', () => ({
  idbPersister: { removeClient: vi.fn().mockResolvedValue(undefined) },
}));
import { getGlobalAudioElement, useSpotifyPlayerStore } from '../useSpotifyPlayerStore';
import { integrationsApi } from '@/shared/api/integrationsApi';
import { resetSessionStores } from '../resetSession';

const track = (id: string, streamUrl?: string) => ({
  id,
  streamUrl,
  title: id,
  artist: 'Fixture',
  albumArt: '',
  durationMs: 60000,
  spotifyUrl: '',
  previewUrl: null,
  source: 'soundcloud' as const,
});

describe('SoundCloud media lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hls.instances.length = 0;
    hls.failAttach = false;
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  });
  afterEach(() => {
    resetSessionStores();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  it('bounds HLS buffers and destroys the previous stream on replacement and reset', async () => {
    useSpotifyPlayerStore.getState().playTrack(track('sc-one', '/one.m3u8'), [track('sc-next')]);
    await vi.waitFor(() => expect(hls.instances).toHaveLength(1));
    expect(hls.instances[0].config).toMatchObject({
      enableWorker: true,
      backBufferLength: 10,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      maxBufferSize: 8 * 1024 * 1024,
    });
    useSpotifyPlayerStore.getState().playTrack(track('sc-two', '/two.m3u8'), [track('sc-next')]);
    await vi.waitFor(() => expect(hls.instances).toHaveLength(2));
    expect(hls.instances[0].destroy).toHaveBeenCalledOnce();
    resetSessionStores();
    expect(hls.instances[1].destroy).toHaveBeenCalledOnce();
    expect(getGlobalAudioElement()?.getAttribute('src')).toBeNull();
  });

  it('a failed old stream lookup cannot stop a newer track', async () => {
    let reject!: (reason: Error) => void;
    vi.mocked(integrationsApi.getSoundCloudStream).mockReturnValueOnce(
      new Promise((_, r) => {
        reject = r;
      }),
    );
    useSpotifyPlayerStore.getState().playTrack(track('sc-delayed'), [track('sc-next')]);
    useSpotifyPlayerStore
      .getState()
      .playTrack(track('sc-current', '/current.mp3'), [track('sc-next')]);
    reject(new Error('old request failed'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useSpotifyPlayerStore.getState().currentTrack?.id).toBe('sc-current');
    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(true);
  });

  it('a late HLS manifest cannot restart a paused track, and resume restarts loading', async () => {
    useSpotifyPlayerStore.getState().playTrack(track('sc-late', '/late.m3u8'), [track('sc-next')]);
    await vi.waitFor(() => expect(hls.instances).toHaveLength(1));
    const instance = hls.instances[0];
    useSpotifyPlayerStore.getState().pause();
    instance.events.get('manifest')!();
    expect(getGlobalAudioElement()?.play).not.toHaveBeenCalled();
    expect(instance.stopLoad).toHaveBeenCalled();
    useSpotifyPlayerStore.getState().resume();
    expect(instance.startLoad).toHaveBeenCalled();
    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(true);
  });

  it('destroys a partially attached HLS worker on initialization failure', async () => {
    hls.failAttach = true;
    useSpotifyPlayerStore
      .getState()
      .playTrack(track('sc-failed', '/failed.m3u8'), [track('sc-next')]);
    await vi.waitFor(() => expect(hls.instances).toHaveLength(1));
    expect(hls.instances[0].destroy).toHaveBeenCalledOnce();
    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(false);
  });

  it('retains the retry cooldown after replacing an expired stream', async () => {
    vi.useFakeTimers();
    vi.mocked(integrationsApi.getSoundCloudStream).mockResolvedValue({
      streamUrl: '/fresh.m3u8',
      isHls: true,
      mimeType: 'application/vnd.apple.mpegurl',
    });
    useSpotifyPlayerStore
      .getState()
      .playTrack(track('sc-expired', '/expired.m3u8'), [track('sc-next')]);
    await vi.waitFor(() => expect(hls.instances).toHaveLength(1));
    hls.instances[0].events.get('error')!('error', { type: 'network' });
    await vi.waitFor(() => expect(hls.instances).toHaveLength(2));
    hls.instances[1].events.get('error')!('error', { type: 'network' });
    expect(integrationsApi.getSoundCloudStream).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3001);
    hls.instances[1].events.get('error')!('error', { type: 'network' });
    expect(integrationsApi.getSoundCloudStream).toHaveBeenCalledTimes(2);
  });

  it('ignores an old play rejection after the same track is restarted', async () => {
    let reject!: (reason: Error) => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValueOnce(
      new Promise((_, r) => {
        reject = r;
      }),
    );
    useSpotifyPlayerStore.getState().playTrack(track('sc-same', '/old.mp3'), [track('sc-next')]);
    useSpotifyPlayerStore.getState().playTrack(track('sc-same', '/new.mp3'), [track('sc-next')]);
    reject(new Error('old playback failed'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(integrationsApi.getSoundCloudStream).not.toHaveBeenCalled();
    expect(useSpotifyPlayerStore.getState().isPlaying).toBe(true);
  });

  it('resume can retry when a refresh response arrived while paused', async () => {
    let resolve!: (value: { streamUrl: string; isHls: boolean; mimeType: string }) => void;
    vi.mocked(integrationsApi.getSoundCloudStream)
      .mockReturnValueOnce(
        new Promise((r) => {
          resolve = r;
        }),
      )
      .mockResolvedValueOnce({ streamUrl: '/fresh.mp3', isHls: false, mimeType: 'audio/mpeg' });
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('expired URL'));
    useSpotifyPlayerStore
      .getState()
      .playTrack(track('sc-paused-retry', '/expired.mp3'), [track('sc-next')]);
    await vi.waitFor(() => expect(integrationsApi.getSoundCloudStream).toHaveBeenCalledOnce());
    useSpotifyPlayerStore.getState().pause();
    resolve({ streamUrl: '/fresh.mp3', isHls: false, mimeType: 'audio/mpeg' });
    await new Promise((r) => setTimeout(r, 0));
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('still expired'));
    useSpotifyPlayerStore.getState().resume();
    await vi.waitFor(() => expect(integrationsApi.getSoundCloudStream).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(getGlobalAudioElement()?.getAttribute('src')).toBe('/fresh.mp3'));
  });
});
