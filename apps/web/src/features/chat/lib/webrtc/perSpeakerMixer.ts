/**
 * Per-Speaker Custom Audio Mixer
 *
 * Professional studio-grade audio channel per WebRTC call participant:
 * - Volume slider: 0% to 200% (boosts quiet microphones without clipping)
 * - 3-band parametric EQ (Low @ 250Hz, Mid @ 1500Hz, High @ 4000Hz) via BiquadFilterNodes
 * - Stereo Panning: Left (-1.0) to Right (+1.0) via StereoPannerNode for spatial participant separation
 */

import * as React from 'react';

export interface SpeakerMixerProfile {
  volume: number; // 0.0 - 2.0 (0% - 200%)
  eqLow: number; // -12 to +12 dB
  eqMid: number; // -12 to +12 dB
  eqHigh: number; // -12 to +12 dB
  pan: number; // -1.0 to +1.0
}

export const DEFAULT_MIXER_PROFILE: SpeakerMixerProfile = {
  volume: 1.0,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  pan: 0,
};

export class SpeakerAudioChannel {
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private lowFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private highFilter: BiquadFilterNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private gainNode: GainNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private outputTrack: MediaStreamTrack | null = null;

  private profile: SpeakerMixerProfile;

  constructor(stream: MediaStream, initialProfile: Partial<SpeakerMixerProfile> = {}) {
    this.profile = { ...DEFAULT_MIXER_PROFILE, ...initialProfile };
    this.initAudioGraph(stream);
  }

  private initAudioGraph(stream: MediaStream): void {
    if (typeof window === 'undefined') return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.audioCtx = new AudioCtx();
      this.sourceNode = this.audioCtx.createMediaStreamSource(stream);

      // Low band: Low-shelf filter at 250 Hz
      this.lowFilter = this.audioCtx.createBiquadFilter();
      this.lowFilter.type = 'lowshelf';
      this.lowFilter.frequency.value = 250;
      this.lowFilter.gain.value = this.profile.eqLow;

      // Mid band: Peaking filter at 1500 Hz with Q = 1.0
      this.midFilter = this.audioCtx.createBiquadFilter();
      this.midFilter.type = 'peaking';
      this.midFilter.frequency.value = 1500;
      this.midFilter.Q.value = 1.0;
      this.midFilter.gain.value = this.profile.eqMid;

      // High band: High-shelf filter at 4000 Hz
      this.highFilter = this.audioCtx.createBiquadFilter();
      this.highFilter.type = 'highshelf';
      this.highFilter.frequency.value = 4000;
      this.highFilter.gain.value = this.profile.eqHigh;

      // Stereo panner
      if (typeof this.audioCtx.createStereoPanner === 'function') {
        this.pannerNode = this.audioCtx.createStereoPanner();
        this.pannerNode.pan.value = this.profile.pan;
      }

      // Master channel gain (0% - 200%)
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = this.profile.volume;

      // MediaStream destination to produce post-processed output track
      this.destinationNode = this.audioCtx.createMediaStreamDestination();

      // Connect DSP chain: Source -> Low -> Mid -> High -> Panner -> Gain -> Destination
      let current: AudioNode = this.sourceNode;
      current.connect(this.lowFilter);
      current = this.lowFilter;

      current.connect(this.midFilter);
      current = this.midFilter;

      current.connect(this.highFilter);
      current = this.highFilter;

      if (this.pannerNode) {
        current.connect(this.pannerNode);
        current = this.pannerNode;
      }

      current.connect(this.gainNode);
      this.gainNode.connect(this.destinationNode);

      const tracks = this.destinationNode.stream.getAudioTracks();
      if (tracks.length > 0) {
        this.outputTrack = tracks[0];
      }
    } catch (err) {
      console.warn('[SpeakerAudioChannel] Failed to initialize Web Audio DSP chain:', err);
    }
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(2.0, volume));
    this.profile.volume = clamped;
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.02);
    }
  }

  public setEqLow(gainDb: number): void {
    const clamped = Math.max(-12, Math.min(12, gainDb));
    this.profile.eqLow = clamped;
    if (this.lowFilter && this.audioCtx) {
      this.lowFilter.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.02);
    }
  }

  public setEqMid(gainDb: number): void {
    const clamped = Math.max(-12, Math.min(12, gainDb));
    this.profile.eqMid = clamped;
    if (this.midFilter && this.audioCtx) {
      this.midFilter.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.02);
    }
  }

  public setEqHigh(gainDb: number): void {
    const clamped = Math.max(-12, Math.min(12, gainDb));
    this.profile.eqHigh = clamped;
    if (this.highFilter && this.audioCtx) {
      this.highFilter.gain.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.02);
    }
  }

  public setPan(pan: number): void {
    const clamped = Math.max(-1.0, Math.min(1.0, pan));
    this.profile.pan = clamped;
    if (this.pannerNode && this.audioCtx) {
      this.pannerNode.pan.setTargetAtTime(clamped, this.audioCtx.currentTime, 0.02);
    }
  }

  public getProfile(): SpeakerMixerProfile {
    return { ...this.profile };
  }

  public getProcessedTrack(): MediaStreamTrack | null {
    return this.outputTrack;
  }

  public getProcessedStream(): MediaStream | null {
    return this.destinationNode?.stream || null;
  }

  public destroy(): void {
    try {
      this.sourceNode?.disconnect();
      this.lowFilter?.disconnect();
      this.midFilter?.disconnect();
      this.highFilter?.disconnect();
      this.pannerNode?.disconnect();
      this.gainNode?.disconnect();
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
    } catch {
      // AudioContext cleanup ignore
    }

    this.sourceNode = null;
    this.lowFilter = null;
    this.midFilter = null;
    this.highFilter = null;
    this.pannerNode = null;
    this.gainNode = null;
    this.destinationNode = null;
    this.outputTrack = null;
    this.audioCtx = null;
  }
}

export class PerSpeakerMixerManager {
  private channels = new Map<string, SpeakerAudioChannel>();
  private profiles = new Map<string, SpeakerMixerProfile>();
  private listeners = new Set<(userId: string, profile: SpeakerMixerProfile) => void>();

  public attachSpeaker(userId: string, stream: MediaStream): SpeakerAudioChannel {
    this.detachSpeaker(userId);

    const existingProfile = this.profiles.get(userId) || DEFAULT_MIXER_PROFILE;
    const channel = new SpeakerAudioChannel(stream, existingProfile);
    this.channels.set(userId, channel);
    return channel;
  }

  public detachSpeaker(userId: string): void {
    const channel = this.channels.get(userId);
    if (channel) {
      channel.destroy();
      this.channels.delete(userId);
    }
  }

  public updateProfile(userId: string, updates: Partial<SpeakerMixerProfile>): SpeakerMixerProfile {
    const current = this.profiles.get(userId) || { ...DEFAULT_MIXER_PROFILE };
    const updated = { ...current, ...updates };
    this.profiles.set(userId, updated);

    const channel = this.channels.get(userId);
    if (channel) {
      if (updates.volume !== undefined) channel.setVolume(updates.volume);
      if (updates.eqLow !== undefined) channel.setEqLow(updates.eqLow);
      if (updates.eqMid !== undefined) channel.setEqMid(updates.eqMid);
      if (updates.eqHigh !== undefined) channel.setEqHigh(updates.eqHigh);
      if (updates.pan !== undefined) channel.setPan(updates.pan);
    }

    this.notify(userId, updated);
    return updated;
  }

  public getProfile(userId: string): SpeakerMixerProfile {
    return this.profiles.get(userId) || { ...DEFAULT_MIXER_PROFILE };
  }

  public resetSpeaker(userId: string): SpeakerMixerProfile {
    return this.updateProfile(userId, DEFAULT_MIXER_PROFILE);
  }

  public subscribe(callback: (userId: string, profile: SpeakerMixerProfile) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(userId: string, profile: SpeakerMixerProfile): void {
    this.listeners.forEach((cb) => {
      try {
        cb(userId, profile);
      } catch {
        // Listener error ignore
      }
    });
  }

  public destroy(): void {
    this.channels.forEach((channel) => channel.destroy());
    this.channels.clear();
    this.profiles.clear();
    this.listeners.clear();
  }
}

export const globalSpeakerMixerManager = new PerSpeakerMixerManager();

export function useSpeakerMixer(userId?: string) {
  const [profile, setProfile] = React.useState<SpeakerMixerProfile>(() =>
    userId ? globalSpeakerMixerManager.getProfile(userId) : DEFAULT_MIXER_PROFILE,
  );

  React.useEffect(() => {
    if (!userId) return;
    setProfile(globalSpeakerMixerManager.getProfile(userId));
    return globalSpeakerMixerManager.subscribe((id, updated) => {
      if (id === userId) {
        setProfile(updated);
      }
    });
  }, [userId]);

  const update = React.useCallback(
    (updates: Partial<SpeakerMixerProfile>) => {
      if (!userId) return;
      globalSpeakerMixerManager.updateProfile(userId, updates);
    },
    [userId],
  );

  const reset = React.useCallback(() => {
    if (!userId) return;
    globalSpeakerMixerManager.resetSpeaker(userId);
  }, [userId]);

  return { profile, update, reset };
}
