import Hls from 'hls.js';
import type { SpotifyTrack } from '@/shared/model/useSpotifyPlayerStore';
import { integrationsApi } from '@/entities/showcase/api/integrationsApi';
import { audioCoordinator } from '@/shared/lib/audioCoordinator';

export interface AudioEngineCallbacks {
  onProgress: (positionMs: number, durationMs: number) => void;
  onEnded: () => void;
  onError: (error: any) => void;
  onTrackStarted: (track: SpotifyTrack) => void;
}

export interface IAudioDriver {
  play(track: SpotifyTrack, positionMs?: number): Promise<boolean>;
  pause(): void;
  resume(): void;
  seek(positionMs: number): void;
  setVolume(volume: number): void;
  teardown(): void;
}

/**
 * HTML5 / HLS Audio Driver for SoundCloud and direct streams
 */
export class SoundCloudAudioDriver implements IAudioDriver {
  private audio: HTMLAudioElement | null = null;
  private hls: Hls | null = null;
  private callbacks: AudioEngineCallbacks;
  private currentTrack: SpotifyTrack | null = null;
  private volume: number = 0.8;

  constructor(callbacks: AudioEngineCallbacks) {
    this.callbacks = callbacks;
  }

  private initAudio() {
    if (!this.audio && typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.volume = this.volume;

      this.audio.addEventListener('timeupdate', () => {
        if (!this.audio) return;
        const posMs = Math.floor(this.audio.currentTime * 1000);
        const durMs =
          isFinite(this.audio.duration) && !isNaN(this.audio.duration)
            ? Math.floor(this.audio.duration * 1000)
            : this.currentTrack?.durationMs || 180000;
        this.callbacks.onProgress(posMs, durMs);
      });

      this.audio.addEventListener('ended', () => {
        this.callbacks.onEnded();
      });

      this.audio.addEventListener('error', (e) => {
        this.callbacks.onError(e);
      });
    }
    return this.audio!;
  }

  async play(track: SpotifyTrack, positionMs: number = 0): Promise<boolean> {
    this.teardown();
    this.currentTrack = track;
    const audio = this.initAudio();

    audioCoordinator.play(audio, 'music-audio-engine');

    let streamUrl = track.streamUrl;
    let isHls = Boolean(streamUrl && streamUrl.includes('.m3u8'));

    // Resolve streamUrl from backend if needed
    if (!streamUrl || streamUrl.startsWith('/api')) {
      try {
        const res = await integrationsApi.getSoundCloudStream(track.id);
        if (res?.streamUrl) {
          streamUrl = res.streamUrl;
          isHls = Boolean(res.isHls || streamUrl.includes('.m3u8'));
        }
      } catch (err) {
        this.callbacks.onError(err);
        return false;
      }
    }

    if (!streamUrl) {
      this.callbacks.onError(new Error('SoundCloud stream URL could not be resolved'));
      return false;
    }

    if (isHls && Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
      });
      this.hls.loadSource(streamUrl);
      this.hls.attachMedia(audio);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (positionMs > 0) {
          audio.currentTime = positionMs / 1000;
        }
        audio.play().catch((e) => this.callbacks.onError(e));
        this.callbacks.onTrackStarted(track);
      });
    } else {
      audio.src = streamUrl;
      if (positionMs > 0) {
        audio.currentTime = positionMs / 1000;
      }
      try {
        await audio.play();
        this.callbacks.onTrackStarted(track);
      } catch (e) {
        this.callbacks.onError(e);
        return false;
      }
    }

    return true;
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  resume(): void {
    if (this.audio && this.audio.src) {
      audioCoordinator.play(this.audio, 'music-audio-engine');
      this.audio.play().catch((e) => this.callbacks.onError(e));
    }
  }

  seek(positionMs: number): void {
    if (this.audio) {
      this.audio.currentTime = Math.max(0, positionMs / 1000);
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  teardown(): void {
    if (this.hls) {
      try {
        this.hls.destroy();
      } catch {}
      this.hls = null;
    }
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.removeAttribute('src');
        this.audio.load();
      } catch {}
    }
  }
}

/**
 * Unified Audio Engine coordinating SoundCloud and Spotify drivers
 */
export class UnifiedAudioEngine {
  private activeDriver: IAudioDriver | null = null;
  private soundCloudDriver: SoundCloudAudioDriver;
  private callbacks: AudioEngineCallbacks;

  constructor(callbacks: AudioEngineCallbacks) {
    this.callbacks = callbacks;
    this.soundCloudDriver = new SoundCloudAudioDriver(callbacks);
  }

  async play(track: SpotifyTrack, positionMs: number = 0): Promise<boolean> {
    const isSoundCloudUrl = (url?: string | null): boolean => {
      if (!url) return false;
      try {
        const parsed = new URL(url);
        return parsed.hostname === 'soundcloud.com' || parsed.hostname.endsWith('.soundcloud.com');
      } catch {
        return false;
      }
    };

    const isSoundCloud = Boolean(
      track.source === 'soundcloud' ||
      track.id.startsWith('sc-') ||
      track.id.startsWith('soundcloud-') ||
      isSoundCloudUrl(track.spotifyUrl),
    );

    if (this.activeDriver && this.activeDriver !== this.soundCloudDriver) {
      this.activeDriver.teardown();
    }

    if (isSoundCloud) {
      this.activeDriver = this.soundCloudDriver;
      return this.soundCloudDriver.play(track, positionMs);
    }

    // Spotify playback handled cooperatively with Web Playback SDK / preview
    return false;
  }

  pause(): void {
    this.activeDriver?.pause();
  }

  resume(): void {
    this.activeDriver?.resume();
  }

  seek(positionMs: number): void {
    this.activeDriver?.seek(positionMs);
  }

  setVolume(volume: number): void {
    this.soundCloudDriver.setVolume(volume);
  }

  teardown(): void {
    this.activeDriver?.teardown();
    this.activeDriver = null;
  }
}
