const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'sounds');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function writeWav(filename, samples, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);

  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  // Peak normalization to -1.5 dB (0.84) to eliminate any clipping or harsh distortion
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  const gain = peak > 0 ? 0.84 / peak : 1.0;

  for (let i = 0; i < samples.length; i++) {
    // Smooth ramp in and ramp out of entire file to prevent any boundary click
    let s = samples[i] * gain;
    if (i < 44) s *= i / 44;
    if (i > samples.length - 44) s *= (samples.length - i) / 44;

    const clamped = Math.max(-1.0, Math.min(1.0, s));
    const intSample = clamped < 0 ? clamped * 32768 : clamped * 32767;
    buffer.writeInt16LE(Math.round(intSample), 44 + i * 2);
  }

  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  console.log(
    `Generated upgraded sound: ${filename} (${(samples.length / sampleRate).toFixed(2)}s)`,
  );
}

const SR = 44100;

function createBuffer(durationSec) {
  return new Float32Array(Math.floor(durationSec * SR));
}

/**
 * FM (Frequency Modulation) Synthesizer
 * Generates acoustic marimba, wooden blocks, lush bells, and crystal chimes.
 */
function applyFM(
  buf,
  startSec,
  durSec,
  carrierFreq,
  modRatio,
  modIndex,
  amp,
  attackSec = 0.003,
  decaySec = 0.15,
) {
  const startIdx = Math.floor(startSec * SR);
  const endIdx = Math.min(buf.length, Math.floor((startSec + durSec) * SR));
  const len = endIdx - startIdx;
  const modFreq = carrierFreq * modRatio;

  let carPhase = 0;
  let modPhase = 0;

  for (let i = 0; i < len; i++) {
    const t = i / SR;

    // Amplitude envelope
    let env = Math.exp(-t / decaySec);
    if (t < attackSec) {
      env *= t / attackSec;
    }

    // Modulation index envelope (dies faster for natural acoustic pluck/tine)
    const mIdx = modIndex * Math.exp(-t / (decaySec * 0.4));

    modPhase += (2 * Math.PI * modFreq) / SR;
    const modVal = Math.sin(modPhase) * mIdx;

    carPhase += (2 * Math.PI * (carrierFreq + modVal * carrierFreq)) / SR;
    const sample = Math.sin(carPhase) * amp * env;

    buf[startIdx + i] += sample;
  }
}

/**
 * Percussive acoustic woodblock strike (for organic UI mute/unmute clicks)
 */
function applyWoodBlock(buf, startSec, freq, amp, decaySec = 0.035) {
  const startIdx = Math.floor(startSec * SR);
  const len = Math.min(buf.length - startIdx, Math.floor(0.12 * SR));
  let phase1 = 0;
  let phase2 = 0;

  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.exp(-t / decaySec) * (t < 0.002 ? t / 0.002 : 1.0);
    // Two resonant wood modes
    phase1 += (2 * Math.PI * freq) / SR;
    phase2 += (2 * Math.PI * (freq * 1.58)) / SR;

    const s = (Math.sin(phase1) * 0.75 + Math.sin(phase2) * 0.25) * amp * env;
    buf[startIdx + i] += s;
  }
}

/**
 * Bubble / Liquid Pop (with warm acoustic resonance)
 */
function applyBubblePop(buf, startSec, freqStart, freqEnd, amp, durSec = 0.06) {
  const startIdx = Math.floor(startSec * SR);
  const len = Math.min(buf.length - startIdx, Math.floor(durSec * SR));
  let phase = 0;

  for (let i = 0; i < len; i++) {
    const t = i / len;
    const curFreq = freqStart + (freqEnd - freqStart) * Math.pow(t, 0.7);
    phase += (2 * Math.PI * curFreq) / SR;
    const env = Math.sin(Math.PI * t); // Smooth teardrop envelope
    buf[startIdx + i] += Math.sin(phase) * amp * env;
  }
}

/**
 * Mechanical Shutter Click Component
 */
function applyMechanicalClick(buf, startSec, freq, amp, durationSec = 0.015) {
  const startIdx = Math.floor(startSec * SR);
  const len = Math.min(buf.length - startIdx, Math.floor(durationSec * SR));
  let phase = 0;

  for (let i = 0; i < len; i++) {
    const t = i / len;
    const env = (1.0 - t) * (i < 20 ? i / 20 : 1.0);
    phase += (2 * Math.PI * freq) / SR;
    buf[startIdx + i] += (Math.sin(phase) + (Math.random() - 0.5) * 0.3) * amp * env;
  }
}

console.log('Synthesizing improved high-fidelity sounds...');

// 1. mute: Organic Wooden Block Descending ("Tock-tuck" - 540Hz -> 360Hz)
{
  const b = createBuffer(0.22);
  applyWoodBlock(b, 0.0, 540, 0.75, 0.035);
  applyWoodBlock(b, 0.065, 360, 0.7, 0.045);
  writeWav('mute.wav', b);
}

// 2. unmute: Organic Wooden Block Ascending ("Tuck-TOCK" - 360Hz -> 540Hz)
{
  const b = createBuffer(0.22);
  applyWoodBlock(b, 0.0, 360, 0.65, 0.035);
  applyWoodBlock(b, 0.065, 540, 0.8, 0.045);
  writeWav('unmute.wav', b);
}

// 3. deafen: Submarine / Filtered Heavy Low Drop (muffled blanket down: 240Hz -> 120Hz)
{
  const b = createBuffer(0.35);
  const startIdx = 0;
  const len = Math.floor(0.32 * SR);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const progress = i / len;
    const freq = 240 - 130 * Math.pow(progress, 0.6); // smooth drop to 110Hz
    phase += (2 * Math.PI * freq) / SR;
    const env = Math.exp(-t / 0.11) * (t < 0.015 ? t / 0.015 : 1.0);
    // Warm pure bass with 2nd harmonic
    b[startIdx + i] = (Math.sin(phase) * 0.8 + Math.sin(phase * 2) * 0.2) * 0.75 * env;
  }
  writeWav('deafen.wav', b);
}

// 4. undeafen: Crystal Clearing Chime (Opening ears shimmer: 260Hz -> 520Hz -> 1040Hz)
{
  const b = createBuffer(0.38);
  applyFM(b, 0.0, 0.18, 261.63, 2.0, 1.2, 0.5, 0.005, 0.09); // C4
  applyFM(b, 0.08, 0.25, 523.25, 2.0, 1.5, 0.6, 0.005, 0.12); // C5
  applyFM(b, 0.16, 0.22, 1046.5, 1.0, 0.8, 0.4, 0.005, 0.14); // C6
  writeWav('undeafen.wav', b);
}

// 5. camera_on: Real Mechanical Camera Aperture Open (Click + Shutter Slide + Optical rising chirp)
{
  const b = createBuffer(0.26);
  applyMechanicalClick(b, 0.0, 2400, 0.45, 0.015);
  applyFM(b, 0.02, 0.12, 480, 1.5, 0.6, 0.5, 0.008, 0.05); // aperture glide
  applyMechanicalClick(b, 0.07, 3200, 0.55, 0.018); // blade latch
  applyFM(b, 0.08, 0.15, 880, 1.0, 0.4, 0.45, 0.005, 0.08); // lens ready beep
  writeWav('camera_on.wav', b);
}

// 6. camera_off: Real Mechanical Camera Aperture Close (Optical tone dropping + Mechanical snap shut)
{
  const b = createBuffer(0.26);
  applyFM(b, 0.0, 0.1, 880, 1.0, 0.5, 0.45, 0.005, 0.05);
  applyFM(b, 0.04, 0.12, 440, 1.5, 0.6, 0.5, 0.008, 0.05);
  applyMechanicalClick(b, 0.09, 2200, 0.65, 0.02);
  writeWav('camera_off.wav', b);
}

// 7. ptt_activate: High-Tech Aviation / Tactical Radio Chirp (Dual frequency burst)
{
  const b = createBuffer(0.12);
  const len = Math.floor(0.065 * SR);
  let p1 = 0,
    p2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.sin((Math.PI * i) / len);
    p1 += (2 * Math.PI * 1050) / SR;
    p2 += (2 * Math.PI * 1350) / SR;
    b[i] = (Math.sin(p1) * 0.55 + Math.sin(p2) * 0.45) * 0.7 * env;
  }
  applyMechanicalClick(b, 0.05, 1800, 0.35, 0.012);
  writeWav('ptt_activate.wav', b);
}

// 8. ptt_deactivate: Tactical Radio Release Click (Spring release + Squelch tap)
{
  const b = createBuffer(0.12);
  applyMechanicalClick(b, 0.0, 1600, 0.6, 0.018);
  const len = Math.floor(0.045 * SR);
  let p = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const freq = 900 - 450 * t;
    p += (2 * Math.PI * freq) / SR;
    const env = (1.0 - t) * (i < 15 ? i / 15 : 1.0);
    b[i] += Math.sin(p) * 0.4 * env;
  }
  writeWav('ptt_deactivate.wav', b);
}

// 9. user_join: Discord Iconic Marimba / Kalimba Entrance (D4 -> G4 / 293Hz -> 392Hz)
{
  const b = createBuffer(0.55);
  applyFM(b, 0.0, 0.28, 293.66, 3.5, 2.2, 0.65, 0.003, 0.16); // D4 Marimba tine
  applyFM(b, 0.14, 0.38, 392.0, 3.5, 2.2, 0.75, 0.003, 0.22); // G4 Marimba tine
  writeWav('user_join.wav', b);
}

// 10. user_leave: Discord Iconic Marimba / Kalimba Departure (G4 -> D4 / 392Hz -> 293Hz)
{
  const b = createBuffer(0.55);
  applyFM(b, 0.0, 0.26, 392.0, 3.5, 2.0, 0.7, 0.003, 0.16); // G4 Marimba tine
  applyFM(b, 0.14, 0.38, 293.66, 3.5, 2.0, 0.65, 0.003, 0.22); // D4 Marimba tine
  writeWav('user_leave.wav', b);
}

// 11. user_moved: Teleport / Warp Swoop (Spatial phase sweep)
{
  const b = createBuffer(0.36);
  const len = Math.floor(0.32 * SR);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    // Resonant swoop up then down
    const freq = 320 + 480 * Math.sin(Math.PI * t);
    phase += (2 * Math.PI * freq) / SR;
    const env = Math.sin(Math.PI * t);
    b[i] = (Math.sin(phase) * 0.7 + Math.sin(phase * 1.5) * 0.3) * 0.65 * env;
  }
  writeWav('user_moved.wav', b);
}

// 12. outgoing_call: Rich Electric Piano / Vibraphone Pulse (425Hz + 480Hz rich chord 1 time)
{
  const b = createBuffer(0.68);
  applyFM(b, 0.0, 0.62, 425, 2.0, 0.8, 0.45, 0.01, 0.28);
  applyFM(b, 0.0, 0.62, 480, 2.0, 0.8, 0.45, 0.01, 0.28);
  writeWav('outgoing_call.wav', b);
}

// 13. stream_start: High-Tech Broadcast On-Air Flourish (F4 -> A4 -> C5 -> E5 sparkling synth arpeggio)
{
  const b = createBuffer(0.65);
  applyFM(b, 0.0, 0.22, 349.23, 2.0, 1.4, 0.5, 0.005, 0.12); // F4
  applyFM(b, 0.08, 0.24, 440.0, 2.0, 1.4, 0.55, 0.005, 0.13); // A4
  applyFM(b, 0.16, 0.28, 523.25, 2.0, 1.5, 0.6, 0.005, 0.15); // C5
  applyFM(b, 0.24, 0.38, 659.25, 2.0, 1.6, 0.7, 0.005, 0.24); // E5
  writeWav('stream_start.wav', b);
}

// 14. stream_stop: Broadcast Off-Air Sign-Off Chime (E5 -> C5 -> A4 -> F4 gentle descent)
{
  const b = createBuffer(0.65);
  applyFM(b, 0.0, 0.2, 659.25, 2.0, 1.4, 0.6, 0.005, 0.12); // E5
  applyFM(b, 0.08, 0.22, 523.25, 2.0, 1.4, 0.55, 0.005, 0.13); // C5
  applyFM(b, 0.16, 0.26, 440.0, 2.0, 1.3, 0.5, 0.005, 0.15); // A4
  applyFM(b, 0.24, 0.38, 349.23, 2.0, 1.2, 0.55, 0.005, 0.22); // F4
  writeWav('stream_stop.wav', b);
}

// 15. viewer_join: Crystal Wine-Glass Shimmer Ping (1320Hz pristine glass harmonic)
{
  const b = createBuffer(0.38);
  applyFM(b, 0.0, 0.35, 1318.51, 1.0, 0.9, 0.65, 0.002, 0.18); // E6 glass tap
  applyFM(b, 0.0, 0.25, 2637.02, 1.0, 0.4, 0.3, 0.002, 0.12); // crystal overtone
  writeWav('viewer_join.wav', b);
}

// 16. viewer_leave: Soft Hollow Wood Tap Down (620Hz -> 420Hz soft wooden tap)
{
  const b = createBuffer(0.24);
  applyWoodBlock(b, 0.0, 580, 0.6, 0.035);
  applyWoodBlock(b, 0.06, 420, 0.5, 0.045);
  writeWav('viewer_leave.wav', b);
}

// 17. activity_user_join: Water Bubble Pop Rising ("Bloop!" 420Hz -> 840Hz)
{
  const b = createBuffer(0.2);
  applyBubblePop(b, 0.0, 420, 840, 0.75, 0.075);
  applyFM(b, 0.04, 0.12, 840, 1.0, 0.5, 0.4, 0.005, 0.06);
  writeWav('activity_user_join.wav', b);
}

// 18. activity_user_leave: Water Bubble Pop Falling ("Plop!" 780Hz -> 360Hz)
{
  const b = createBuffer(0.2);
  applyBubblePop(b, 0.0, 780, 360, 0.7, 0.075);
  applyFM(b, 0.04, 0.12, 360, 1.0, 0.5, 0.35, 0.005, 0.06);
  writeWav('activity_user_leave.wav', b);
}

console.log('Finished updating 18 requested sounds with studio-quality synthesis!');
