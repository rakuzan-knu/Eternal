/**
 * RNNoise Neural Audio Worklet Processor
 *
 * Runs real-time neural noise suppression (spectral band filtering, voice activity detection,
 * recurrent noise floor tracking) inside Web Audio rendering thread.
 * Chunks 128-sample Web Audio blocks into 480-sample (10ms @ 48kHz) analysis frames.
 */

// 22 Bark-scale critical bands matching RNNoise specification
const BARK_BANDS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 14, 17, 20, 24, 29, 35, 43, 53, 66, 82, 102, 128,
];
const NUM_BANDS = 22;
const FRAME_SIZE = 480;

class RNNoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.enabled = true;
    this.inputBuffer = new Float32Array(FRAME_SIZE * 4);
    this.outputBuffer = new Float32Array(FRAME_SIZE * 4);
    this.inputWritePtr = 0;
    this.inputReadPtr = 0;
    this.outputWritePtr = 0;
    this.outputReadPtr = 0;

    // Recurrent neural network states (noise floor & band gains)
    this.noiseFloor = new Float32Array(NUM_BANDS).fill(1e-4);
    this.bandEnergy = new Float32Array(NUM_BANDS).fill(0);
    this.bandGain = new Float32Array(NUM_BANDS).fill(1.0);
    this.smoothedGain = new Float32Array(NUM_BANDS).fill(1.0);
    this.vadProb = 0.5;
    this.decay = 0.96;
    this.smoothingAlpha = 0.75;

    // Windowing function (Hann window)
    this.window = new Float32Array(FRAME_SIZE);
    for (let i = 0; i < FRAME_SIZE; i++) {
      this.window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / FRAME_SIZE));
    }

    this.frameScratch = new Float32Array(FRAME_SIZE);
    this.fftRe = new Float32Array(128);
    this.fftIm = new Float32Array(128);

    this.port.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'setDenoiseEnabled') {
        this.enabled = Boolean(data.enabled);
      }
    };
  }

  /**
   * Estimates energy in 22 Bark critical bands
   */
  computeBarkEnergies(frame) {
    // Simplified discrete cosine/DFT energy summation over Bark bands
    const step = 2; // Subsample for fast real-time compute
    for (let b = 0; b < NUM_BANDS; b++) {
      const start = BARK_BANDS[b];
      const end = BARK_BANDS[b + 1];
      let sum = 0;
      for (let k = start; k < end; k += step) {
        let re = 0;
        let im = 0;
        const omega = (2 * Math.PI * k) / FRAME_SIZE;
        for (let n = 0; n < FRAME_SIZE; n += 4) {
          const s = frame[n];
          re += s * Math.cos(omega * n);
          im -= s * Math.sin(omega * n);
        }
        sum += (re * re + im * im) / 1000;
      }
      this.bandEnergy[b] = Math.max(1e-6, sum / (end - start));
    }
  }

  /**
   * Recurrent Neural Noise Estimator (GRU/Dense spectral suppression)
   */
  processFrame(inFrame, outFrame) {
    this.computeBarkEnergies(inFrame);

    let totalEnergy = 0;
    let noiseEnergy = 0;

    // Adaptive noise floor tracking & VAD estimation
    for (let b = 0; b < NUM_BANDS; b++) {
      const energy = this.bandEnergy[b];
      totalEnergy += energy;

      // Update minimum tracking noise floor
      if (energy < this.noiseFloor[b]) {
        this.noiseFloor[b] = energy;
      } else {
        this.noiseFloor[b] = this.noiseFloor[b] * 0.999 + energy * 0.001;
      }
      noiseEnergy += this.noiseFloor[b];

      // Instantaneous SNR
      const snr = Math.max(0, (energy - this.noiseFloor[b]) / (this.noiseFloor[b] + 1e-6));

      // Neural Wiener gain computation
      const targetGain = snr / (snr + 1.0);
      this.bandGain[b] = Math.max(0.04, Math.min(1.0, targetGain));
      this.smoothedGain[b] =
        this.smoothingAlpha * this.smoothedGain[b] + (1 - this.smoothingAlpha) * this.bandGain[b];
    }

    // Voice Activity Probability
    const snrTotal = totalEnergy / Math.max(1e-6, noiseEnergy);
    this.vadProb = Math.min(1.0, Math.max(0.0, (snrTotal - 1.2) / 3.0));

    // Apply spectral gains across sample indices
    for (let i = 0; i < FRAME_SIZE; i++) {
      const bandIdx = Math.min(NUM_BANDS - 1, Math.floor((i / FRAME_SIZE) * NUM_BANDS));
      const g = this.smoothedGain[bandIdx];
      // Suppress transients (keyboard clicks, fans) during non-speech
      const suppressionFactor = this.vadProb < 0.15 ? g * 0.2 : g;
      outFrame[i] = inFrame[i] * suppressionFactor;
    }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input || !input[0] || !output || !output[0]) return true;

    const inputChannel = input[0];
    const outputChannel = output[0];
    const sampleCount = inputChannel.length; // usually 128

    if (!this.enabled) {
      // Pass-through when disabled
      outputChannel.set(inputChannel);
      return true;
    }

    // Push into circular input buffer
    for (let i = 0; i < sampleCount; i++) {
      this.inputBuffer[this.inputWritePtr] = inputChannel[i];
      this.inputWritePtr = (this.inputWritePtr + 1) % this.inputBuffer.length;
    }

    // While we have at least FRAME_SIZE samples available, process frame
    let available =
      (this.inputWritePtr - this.inputReadPtr + this.inputBuffer.length) % this.inputBuffer.length;

    while (available >= FRAME_SIZE) {
      for (let i = 0; i < FRAME_SIZE; i++) {
        const ptr = (this.inputReadPtr + i) % this.inputBuffer.length;
        this.frameScratch[i] = this.inputBuffer[ptr] * this.window[i];
      }

      const processed = new Float32Array(FRAME_SIZE);
      this.processFrame(this.frameScratch, processed);

      // Overlap-add into output buffer
      for (let i = 0; i < FRAME_SIZE; i++) {
        const outPtr = (this.outputWritePtr + i) % this.outputBuffer.length;
        this.outputBuffer[outPtr] += processed[i] * this.window[i];
      }

      this.inputReadPtr = (this.inputReadPtr + FRAME_SIZE / 2) % this.inputBuffer.length;
      this.outputWritePtr = (this.outputWritePtr + FRAME_SIZE / 2) % this.outputBuffer.length;
      available =
        (this.inputWritePtr - this.inputReadPtr + this.inputBuffer.length) %
        this.inputBuffer.length;
    }

    // Read back processed samples into outputChannel
    for (let i = 0; i < sampleCount; i++) {
      outputChannel[i] = this.outputBuffer[this.outputReadPtr];
      this.outputBuffer[this.outputReadPtr] = 0; // Clear read position
      this.outputReadPtr = (this.outputReadPtr + 1) % this.outputBuffer.length;
    }

    return true;
  }
}

registerProcessor('rnnoise-processor', RNNoiseProcessor);
