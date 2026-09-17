/**
 * RNNoise Neural Noise Suppression Audio Pipeline Manager
 *
 * Integrates AudioWorklet / WebAssembly neural filtering with graceful fallback
 * to Web Audio high-pass + dynamics processing if worklets are unavailable.
 */

export interface DenoisedStreamHandle {
  cleanStream: MediaStream;
  setDenoiseEnabled: (enabled: boolean) => void;
  destroy: () => void;
}

class RNNoiseManager {
  private audioContext: AudioContext | null = null;
  private workletLoaded = false;
  private loadPromise: Promise<boolean> | null = null;

  private async getAudioContext(): Promise<AudioContext> {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 48000, latencyHint: 'interactive' });
    }
    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume().catch(() => {});
    }
    return this.audioContext;
  }

  private async initWorklet(ctx: AudioContext): Promise<boolean> {
    if (this.workletLoaded) return true;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        if (!ctx.audioWorklet) return false;
        const load = ctx.audioWorklet
          .addModule('/rnnoise-processor.js')
          .then(() => true)
          .catch((err) => {
            console.warn('AudioWorklet RNNoise module not loaded, falling back to DSP filter', err);
            return false;
          });
        const timeout = new Promise<boolean>((resolve) =>
          setTimeout(() => {
            console.warn('[rnnoise] AudioWorklet load timed out, falling back to DSP filter');
            resolve(false);
          }, 1500),
        );
        const success = await Promise.race([load, timeout]);
        this.workletLoaded = success;
        return success;
      } catch (err) {
        console.warn('AudioWorklet RNNoise module not loaded, falling back to DSP filter', err);
        return false;
      }
    })();

    return this.loadPromise;
  }

  async createDenoisedStream(
    sourceStream: MediaStream,
    initialEnabled = true,
  ): Promise<DenoisedStreamHandle> {
    const audioTrack = sourceStream.getAudioTracks()[0];
    if (!audioTrack) {
      return {
        cleanStream: sourceStream,
        setDenoiseEnabled: () => {},
        destroy: () => {},
      };
    }

    try {
      const ctx = await this.getAudioContext();
      const hasWorklet = await this.initWorklet(ctx);

      const sourceNode = ctx.createMediaStreamSource(sourceStream);
      const destinationNode = ctx.createMediaStreamDestination();

      let workletNode: AudioWorkletNode | null = null;
      let fallbackHighpass: BiquadFilterNode | null = null;
      let fallbackCompressor: DynamicsCompressorNode | null = null;

      if (hasWorklet) {
        workletNode = new AudioWorkletNode(ctx, 'rnnoise-processor');
        workletNode.port.postMessage({ type: 'setDenoiseEnabled', enabled: initialEnabled });

        sourceNode.connect(workletNode);
        workletNode.connect(destinationNode);
      } else {
        // High-pass filter to eliminate sub-80Hz room rumble & fan noise
        fallbackHighpass = ctx.createBiquadFilter();
        fallbackHighpass.type = 'highpass';
        fallbackHighpass.frequency.setValueAtTime(80, ctx.currentTime);

        // Dynamics compressor to tame sudden transients (keyboard clicks, taps)
        fallbackCompressor = ctx.createDynamicsCompressor();
        fallbackCompressor.threshold.setValueAtTime(-24, ctx.currentTime);
        fallbackCompressor.knee.setValueAtTime(12, ctx.currentTime);
        fallbackCompressor.ratio.setValueAtTime(8, ctx.currentTime);
        fallbackCompressor.attack.setValueAtTime(0.003, ctx.currentTime);
        fallbackCompressor.release.setValueAtTime(0.1, ctx.currentTime);

        sourceNode.connect(fallbackHighpass);
        fallbackHighpass.connect(fallbackCompressor);
        fallbackCompressor.connect(destinationNode);
      }

      const cleanTrack = destinationNode.stream.getAudioTracks()[0];
      const cleanStream = new MediaStream([cleanTrack]);

      // Copy track metadata
      cleanTrack.enabled = audioTrack.enabled;
      audioTrack.onmute = () => {
        cleanTrack.enabled = false;
      };
      audioTrack.onunmute = () => {
        cleanTrack.enabled = audioTrack.enabled;
      };

      const setDenoiseEnabled = (enabled: boolean) => {
        if (workletNode) {
          workletNode.port.postMessage({ type: 'setDenoiseEnabled', enabled });
        } else if (fallbackHighpass && fallbackCompressor) {
          if (enabled) {
            fallbackHighpass.frequency.setValueAtTime(80, ctx.currentTime);
          } else {
            fallbackHighpass.frequency.setValueAtTime(10, ctx.currentTime);
          }
        }
      };

      const destroy = () => {
        try {
          sourceNode.disconnect();
          if (workletNode) {
            workletNode.disconnect();
          }
          if (fallbackHighpass) fallbackHighpass.disconnect();
          if (fallbackCompressor) fallbackCompressor.disconnect();
          cleanTrack.stop();
        } catch {
          // ignore disconnect errors during teardown
        }
      };

      return {
        cleanStream,
        setDenoiseEnabled,
        destroy,
      };
    } catch (err) {
      console.warn('Failed to initialize RNNoise audio stream, using original mic stream', err);
      return {
        cleanStream: sourceStream,
        setDenoiseEnabled: () => {},
        destroy: () => {},
      };
    }
  }
}

export const rnnoiseManager = new RNNoiseManager();
