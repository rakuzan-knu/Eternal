import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundCloudAudioDriver } from '../audioEngine';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';

vi.mock('hls.js', () => ({ default: { isSupported: () => false } }));
vi.mock('@/entities/showcase/api/integrationsApi', () => ({
  integrationsApi: { getSoundCloudStream: vi.fn() },
}));
vi.mock('@/shared/lib/audioCoordinator', () => ({ audioCoordinator: { play: vi.fn() } }));

const track: SpotifyTrack = {
  id: 'sc-track',
  title: 'Track',
  artist: 'Artist',
  albumArt: '',
  durationMs: 60000,
  spotifyUrl: '',
  previewUrl: null,
  source: 'soundcloud',
};
const mediaUrl = 'https://cf-media.sndcdn.com/track.mp3';

describe('SoundCloudAudioDriver stream validation', () => {
  let driver: SoundCloudAudioDriver;
  const onError = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    driver = new SoundCloudAudioDriver({
      onError,
      onEnded: vi.fn(),
      onProgress: vi.fn(),
      onTrackStarted: vi.fn(),
    });
  });
  afterEach(() => {
    driver.teardown();
    vi.restoreAllMocks();
  });

  it('plays trusted provider media without resolving through the API', async () => {
    expect(await driver.play({ ...track, streamUrl: mediaUrl })).toBe(true);
    expect(integrationsApi.getSoundCloudStream).not.toHaveBeenCalled();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });

  it('resolves legacy API sources to direct provider media', async () => {
    vi.mocked(integrationsApi.getSoundCloudStream).mockResolvedValue({
      streamUrl: mediaUrl,
      isHls: false,
      mimeType: 'audio/mpeg',
    });
    expect(
      await driver.play({
        ...track,
        streamUrl: '/api/integrations/soundcloud/stream/sc-track/audio',
      }),
    ).toBe(true);
    expect(integrationsApi.getSoundCloudStream).toHaveBeenCalledWith('sc-track');
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });

  it('does not play unsupported media returned by the resolver', async () => {
    vi.mocked(integrationsApi.getSoundCloudStream).mockResolvedValue({
      streamUrl: 'https://attacker.test/audio.mp3',
      isHls: false,
      mimeType: 'audio/mpeg',
    });
    expect(await driver.play(track)).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });
});
