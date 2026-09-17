/**
 * WebRTC Audio Mixer (System / Tab Audio + Microphone) with Sidechain Ducking
 *
 * Mixes microphone audio with captured system/tab audio from getDisplayMedia
 * using Web Audio API AudioContext, DynamicsCompressorNode, and Gain nodes.
 * Features automatic sidechain ducking of background media when the speaker speaks.
 */

import { createSidechainDuckerNode } from './sidechainDuckerProcessor';

export interface AudioMixerOptions {
  micGain?: number;
  screenGain?: number;
}

export class AudioMixer {
  private audioCtx: AudioContext | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private screenSource: MediaStreamAudioSourceNode | null = null;
  private micGainNode: GainNode | null = null;
  private screenGainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private duckerWorkletNode: AudioWorkletNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private outputTrack: MediaStreamTrack | null = null;
  private baseScreenGain = 0.8;
  private isDucked = false;

  constructor(
    private readonly micTrack: MediaStreamTrack,
    private readonly screenAudioTrack: MediaStreamTrack,
    options: AudioMixerOptions = {},
  ) {
    this.baseScreenGain = options.screenGain ?? 0.8;
    this.init(options.micGain ?? 1.0, this.baseScreenGain);
  }

  private init(initialMicGain: number, initialScreenGain: number): void {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) {
        this.outputTrack = this.micTrack;
        return;
      }

      this.audioCtx = new AudioContextClass();
      this.micSource = this.audioCtx.createMediaStreamSource(new MediaStream([this.micTrack]));
      this.screenSource = this.audioCtx.createMediaStreamSource(
        new MediaStream([this.screenAudioTrack]),
      );

      this.micGainNode = this.audioCtx.createGain();
      this.micGainNode.gain.value = initialMicGain;

      this.screenGainNode = this.audioCtx.createGain();
      this.screenGainNode.gain.value = initialScreenGain;

      // Dynamics compressor prevents clipping and smoothes system audio
      this.compressorNode = this.audioCtx.createDynamicsCompressor();
      this.compressorNode.threshold.setValueAtTime(-24, this.audioCtx.currentTime);
      this.compressorNode.knee.setValueAtTime(30, this.audioCtx.currentTime);
      this.compressorNode.ratio.setValueAtTime(12, this.audioCtx.currentTime);
      this.compressorNode.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
      this.compressorNode.release.setValueAtTime(0.25, this.audioCtx.currentTime);

      this.destinationNode = this.audioCtx.createMediaStreamDestination();

      // Mic routing: Mic -> Gain -> Destination
      this.micSource.connect(this.micGainNode).connect(this.destinationNode);

      // Screen routing: Screen -> Gain -> Compressor -> Destination
      this.screenSource
        .connect(this.screenGainNode)
        .connect(this.compressorNode)
        .connect(this.destinationNode);

      // Attempt loading pure AudioWorklet sidechain ducker DSP
      if (this.audioCtx && typeof this.audioCtx.audioWorklet !== 'undefined') {
        void createSidechainDuckerNode(this.audioCtx).then((node) => {
          if (node && this.micGainNode && this.screenGainNode && this.destinationNode) {
            try {
              this.duckerWorkletNode = node;
              // Reroute through worklet
              this.micGainNode.disconnect();
              this.screenGainNode.disconnect();
              this.micGainNode.connect(node, 0, 0);
              this.screenGainNode.connect(node, 0, 1);
              node.connect(this.destinationNode);
            } catch {
              // fallback remains active
            }
          }
        });
      }

      this.outputTrack = this.destinationNode.stream.getAudioTracks()[0] || null;

      if (this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }
    } catch {
      // Fallback to mic track directly on environment restrictions
      this.outputTrack = this.micTrack;
    }
  }

  public getMixedTrack(): MediaStreamTrack | null {
    return this.outputTrack || this.micTrack;
  }

  public setMicGain(value: number): void {
    if (this.micGainNode && this.audioCtx) {
      this.micGainNode.gain.setValueAtTime(value, this.audioCtx.currentTime);
    }
  }

  public setScreenGain(value: number): void {
    this.baseScreenGain = value;
    if (!this.isDucked && this.screenGainNode && this.audioCtx) {
      this.screenGainNode.gain.setValueAtTime(value, this.audioCtx.currentTime);
    }
  }

  /**
   * Smoothly ducks background system audio by ~75% when local speech is detected
   */
  public duckSystemAudio(shouldDuck: boolean): void {
    if (!this.screenGainNode || !this.audioCtx) return;
    this.isDucked = shouldDuck;
    const now = this.audioCtx.currentTime;

    if (shouldDuck) {
      // Duck down smoothly over 80ms
      const duckedGain = Math.max(0.05, this.baseScreenGain * 0.25);
      this.screenGainNode.gain.cancelScheduledValues(now);
      this.screenGainNode.gain.setValueAtTime(this.screenGainNode.gain.value, now);
      if (typeof this.screenGainNode.gain.linearRampToValueAtTime === 'function') {
        this.screenGainNode.gain.linearRampToValueAtTime(duckedGain, now + 0.08);
      } else {
        this.screenGainNode.gain.value = duckedGain;
      }
    } else {
      // Restore smoothly over 350ms
      this.screenGainNode.gain.cancelScheduledValues(now);
      this.screenGainNode.gain.setValueAtTime(this.screenGainNode.gain.value, now);
      if (typeof this.screenGainNode.gain.linearRampToValueAtTime === 'function') {
        this.screenGainNode.gain.linearRampToValueAtTime(this.baseScreenGain, now + 0.35);
      } else {
        this.screenGainNode.gain.value = this.baseScreenGain;
      }
    }
  }

  public stop(): void {
    try {
      this.micSource?.disconnect();
      this.screenSource?.disconnect();
      this.micGainNode?.disconnect();
      this.screenGainNode?.disconnect();
      this.compressorNode?.disconnect();
      if (this.audioCtx && this.audioCtx.state !== 'closed') {
        void this.audioCtx.close();
      }
    } catch {
      // Cleanup catch
    }
    this.micSource = null;
    this.screenSource = null;
    this.micGainNode = null;
    this.screenGainNode = null;
    this.compressorNode = null;
    this.destinationNode = null;
    this.outputTrack = null;
    this.audioCtx = null;
  }
}
