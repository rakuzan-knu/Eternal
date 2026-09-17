/**
 * Sub-50kbps Vector Mesh Fallback Engine for Extreme Network Conditions
 *
 * Transmits compact 16-bit binary facial landmarks (<2.5 kbps) instead of heavy
 * pixel video frames when bandwidth drops below 50 kbps on 2G/satellite links.
 * Renders an animated cybernetic 3D wireframe mesh avatar with silky 60 FPS lerp.
 */

export interface NormalizedLandmark {
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
  z?: number; // -0.5 to 0.5 (optional depth)
}

export const VECTOR_MESH_MAGIC = 0x56; // 'V'
export const VECTOR_MESH_VERSION = 0x01;

// Canonical facial wireframe connection topology (pairs of landmark indices)
export const FACIAL_WIREFRAME_EDGES: Array<[number, number]> = [
  // Jawline
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  // Left Eyebrow
  [9, 10],
  [10, 11],
  [11, 12],
  // Right Eyebrow
  [13, 14],
  [14, 15],
  [15, 16],
  // Nose Bridge & Tip
  [17, 18],
  [18, 19],
  [19, 20],
  [20, 21],
  // Left Eye
  [22, 23],
  [23, 24],
  [24, 25],
  [25, 22],
  // Right Eye
  [26, 27],
  [27, 28],
  [28, 29],
  [29, 26],
  // Outer Lips
  [30, 31],
  [31, 32],
  [32, 33],
  [33, 34],
  [34, 35],
  [35, 30],
];

/**
 * Encodes landmark points into a binary buffer (~150-250 bytes)
 */
export function encodeVectorMeshFrame(landmarks: NormalizedLandmark[]): Uint8Array {
  const count = Math.min(255, landmarks.length);
  const buffer = new Uint8Array(4 + count * 6);
  const view = new DataView(buffer.buffer);

  view.setUint8(0, VECTOR_MESH_MAGIC);
  view.setUint8(1, VECTOR_MESH_VERSION);
  view.setUint8(2, count);
  view.setUint8(3, 0x00); // flags

  for (let i = 0; i < count; i++) {
    const pt = landmarks[i]!;
    const offset = 4 + i * 6;

    // 16-bit fixed-point unsigned [0, 65535]
    const uX = Math.max(0, Math.min(65535, Math.round(pt.x * 65535)));
    const uY = Math.max(0, Math.min(65535, Math.round(pt.y * 65535)));
    // 16-bit fixed-point signed [-32768, 32767]
    const sZ = Math.max(-32768, Math.min(32767, Math.round((pt.z ?? 0) * 65535)));

    view.setUint16(offset, uX, false);
    view.setUint16(offset + 2, uY, false);
    view.setInt16(offset + 4, sZ, false);
  }

  return buffer;
}

/**
 * Decodes binary buffer back into normalized landmark coordinates
 */
export function decodeVectorMeshFrame(buffer: Uint8Array): NormalizedLandmark[] {
  if (buffer.byteLength < 4) return [];
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  if (view.getUint8(0) !== VECTOR_MESH_MAGIC || view.getUint8(1) !== VECTOR_MESH_VERSION) {
    return [];
  }

  const count = view.getUint8(2);
  const expectedLength = 4 + count * 6;
  if (buffer.byteLength < expectedLength) return [];

  const landmarks: NormalizedLandmark[] = [];
  for (let i = 0; i < count; i++) {
    const offset = 4 + i * 6;
    const uX = view.getUint16(offset, false);
    const uY = view.getUint16(offset + 2, false);
    const sZ = view.getInt16(offset + 4, false);

    landmarks.push({
      x: uX / 65535.0,
      y: uY / 65535.0,
      z: sZ / 65535.0,
    });
  }

  return landmarks;
}

/**
 * Renders received vector mesh frames onto a canvas with smooth interpolation
 */
export class VectorMeshRenderer {
  private currentLandmarks: NormalizedLandmark[] = [];
  private targetLandmarks: NormalizedLandmark[] = [];
  private animFrameId: number | null = null;
  private isRendering = false;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  public updateTargetLandmarks(landmarks: NormalizedLandmark[]): void {
    this.targetLandmarks = landmarks;
    if (this.currentLandmarks.length === 0) {
      this.currentLandmarks = landmarks.map((p) => ({ ...p }));
    }
  }

  public start(): void {
    if (this.isRendering) return;
    this.isRendering = true;
    this.renderLoop();
  }

  public stop(): void {
    this.isRendering = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private renderLoop = (): void => {
    if (!this.isRendering) return;

    this.interpolateAndDraw();
    this.animFrameId = requestAnimationFrame(this.renderLoop);
  };

  private interpolateAndDraw(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark sleek background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    if (this.targetLandmarks.length === 0) {
      return;
    }

    // Smooth lerp towards target landmarks
    const lerpRate = 0.25;
    for (let i = 0; i < this.targetLandmarks.length; i++) {
      const target = this.targetLandmarks[i]!;
      if (!this.currentLandmarks[i]) {
        this.currentLandmarks[i] = { ...target };
      } else {
        const cur = this.currentLandmarks[i]!;
        cur.x += (target.x - cur.x) * lerpRate;
        cur.y += (target.y - cur.y) * lerpRate;
        cur.z = (cur.z ?? 0) + ((target.z ?? 0) - (cur.z ?? 0)) * lerpRate;
      }
    }

    // Draw Cybernetic Grid Lines
    ctx.save();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 6;

    for (const [startIndex, endIndex] of FACIAL_WIREFRAME_EDGES) {
      const p1 = this.currentLandmarks[startIndex];
      const p2 = this.currentLandmarks[endIndex];
      if (!p1 || !p2) continue;

      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    }

    // Draw landmark vertices
    ctx.fillStyle = '#38bdf8';
    for (const pt of this.currentLandmarks) {
      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // HUD Status overlay
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.shadowBlur = 0;
    ctx.fillText('⚡ VECTOR MESH (2G Fallback <50kbps)', 12, 24);

    ctx.restore();
  }
}
