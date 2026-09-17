/**
 * Dynamic Head Tracker for 3D Spatial Audio
 *
 * Tracks head attitude (Yaw, Pitch, Roll) via camera feed using facial geometry
 * and MediaPipe Face Mesh landmark orientation, computing 3D orientation vectors
 * (forward and up) for Web Audio API HRTF AudioListener.
 */

export interface HeadAngles {
  /** Yaw: Turning head left (< 0) / right (> 0) in degrees (-90 to +90) */
  yaw: number;
  /** Pitch: Nodding head down (< 0) / up (> 0) in degrees (-60 to +60) */
  pitch: number;
  /** Roll: Tilting head left (< 0) / right (> 0) in degrees (-45 to +45) */
  roll: number;
}

export interface HeadOrientationVectors {
  /** Unit vector pointing forward from listener's head [x, y, z] */
  forward: [number, number, number];
  /** Unit vector pointing upwards from top of listener's head [x, y, z] */
  up: [number, number, number];
}

export type HeadOrientationCallback = (angles: HeadAngles, vectors: HeadOrientationVectors) => void;

export class HeadTracker {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number | null = null;
  private isTracking = false;
  private smoothing = 0.22; // Low-pass filter alpha factor

  // Current smoothed angles in degrees
  private currentYaw = 0;
  private currentPitch = 0;
  private currentRoll = 0;

  private callback: HeadOrientationCallback | null = null;

  constructor(smoothing = 0.22) {
    this.smoothing = Math.max(0.01, Math.min(1.0, smoothing));
  }

  /**
   * Register callback for real-time head attitude changes
   */
  public onOrientationUpdate(cb: HeadOrientationCallback): void {
    this.callback = cb;
  }

  /**
   * Start tracking from an active MediaStream containing a video track
   */
  public start(stream: MediaStream): boolean {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return false;

    if (typeof document === 'undefined') return false;

    this.stop();

    try {
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;
      if (typeof MediaStream !== 'undefined') {
        this.videoElement.srcObject = new MediaStream([videoTrack]);
      }

      this.canvas = document.createElement('canvas');
      this.canvas.width = 160;
      this.canvas.height = 120;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

      void this.videoElement.play().catch(() => {
        // Handled internally
      });

      this.isTracking = true;
      this.scheduleLoop();
      return true;
    } catch (err) {
      console.warn('[HeadTracker] Failed to start video processing:', err);
      return false;
    }
  }

  /**
   * Stop head tracking and release video/canvas resources
   */
  public stop(): void {
    this.isTracking = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.canvas = null;
    this.ctx = null;
  }

  public getIsTracking(): boolean {
    return this.isTracking;
  }

  /**
   * Directly inject MediaPipe 3D landmark points for exact head pose estimation
   * Key landmarks (standard 468-point face mesh):
   * 1: Nose tip
   * 152: Chin
   * 10: Forehead center
   * 33: Left eye outer
   * 263: Right eye outer
   */
  public processLandmarks(landmarks: Array<{ x: number; y: number; z?: number }>): void {
    if (!landmarks || landmarks.length < 5) return;

    // Use canonical landmarks if 468 mesh available, or first 5 keypoints
    const nose = landmarks[1] || landmarks[0];
    const chin = landmarks[152] || landmarks[1];
    const forehead = landmarks[10] || landmarks[2];
    const leftEye = landmarks[33] || landmarks[3];
    const rightEye = landmarks[263] || landmarks[4];

    // Compute eye center
    const eyeCenterX = (leftEye.x + rightEye.x) / 2;
    const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 0.001;

    // Yaw: horizontal shift of nose tip relative to eye center normalized by eye distance
    // Multiplied by calibration constant (~120 deg range)
    const rawYaw = ((nose.x - eyeCenterX) / eyeDist) * 120;

    // Pitch: vertical shift of nose relative to eye-chin line
    const faceHeight = Math.hypot(chin.x - forehead.x, chin.y - forehead.y) || 0.001;
    const expectedNoseY = forehead.y + faceHeight * 0.45;
    const rawPitch = ((expectedNoseY - nose.y) / faceHeight) * 90;

    // Roll: angle of eye line relative to horizontal
    const rawRoll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

    this.applyAngles(rawYaw, rawPitch, rawRoll);
  }

  /**
   * Apply raw angles with exponential smoothing filter and emit vectors
   */
  public applyAngles(rawYaw: number, rawPitch: number, rawRoll: number): void {
    // Clamp to realistic anatomical range
    const clampedYaw = Math.max(-80, Math.min(80, rawYaw));
    const clampedPitch = Math.max(-50, Math.min(50, rawPitch));
    const clampedRoll = Math.max(-45, Math.min(45, rawRoll));

    // Low-pass exponential smoothing
    this.currentYaw += (clampedYaw - this.currentYaw) * this.smoothing;
    this.currentPitch += (clampedPitch - this.currentPitch) * this.smoothing;
    this.currentRoll += (clampedRoll - this.currentRoll) * this.smoothing;

    const angles: HeadAngles = {
      yaw: Math.round(this.currentYaw * 10) / 10,
      pitch: Math.round(this.currentPitch * 10) / 10,
      roll: Math.round(this.currentRoll * 10) / 10,
    };

    const vectors = this.computeOrientationVectors(angles.yaw, angles.pitch, angles.roll);
    this.callback?.(angles, vectors);
  }

  /**
   * Convert Euler angles (degrees) into unit 3D forward and up vectors for AudioListener
   */
  public computeOrientationVectors(
    yawDeg: number,
    pitchDeg: number,
    rollDeg: number,
  ): HeadOrientationVectors {
    const yaw = (yawDeg * Math.PI) / 180;
    const pitch = (pitchDeg * Math.PI) / 180;
    const roll = (rollDeg * Math.PI) / 180;

    // Forward vector: initially pointing at (0, 0, -1) (into the screen)
    // Rotated by Yaw (around Y axis) and Pitch (around X axis)
    const fx = Math.sin(yaw) * Math.cos(pitch);
    const fy = Math.sin(pitch);
    const fz = -Math.cos(yaw) * Math.cos(pitch);

    // Up vector: initially pointing at (0, 1, 0) (top of head)
    // Rotated by Roll (around Z axis), Yaw, and Pitch
    const ux = -Math.sin(roll) * Math.sin(yaw);
    const uy = Math.cos(roll) * Math.cos(pitch);
    const uz = Math.sin(roll) * Math.cos(yaw);

    // Normalize forward vector
    const fLen = Math.hypot(fx, fy, fz) || 1;
    // Normalize up vector
    const uLen = Math.hypot(ux, uy, uz) || 1;

    return {
      forward: [fx / fLen, fy / fLen, fz / fLen],
      up: [ux / uLen, uy / uLen, uz / uLen],
    };
  }

  public getAngles(): HeadAngles {
    return {
      yaw: Math.round(this.currentYaw * 10) / 10,
      pitch: Math.round(this.currentPitch * 10) / 10,
      roll: Math.round(this.currentRoll * 10) / 10,
    };
  }

  public getVectors(): HeadOrientationVectors {
    return this.computeOrientationVectors(this.currentYaw, this.currentPitch, this.currentRoll);
  }

  private scheduleLoop(): void {
    const step = () => {
      if (!this.isTracking) return;
      this.analyzeCurrentFrame();
      this.animFrameId = requestAnimationFrame(step);
    };
    this.animFrameId = requestAnimationFrame(step);
  }

  /**
   * Lightweight frame analyzer using facial luminance centroid
   */
  private analyzeCurrentFrame(): void {
    const video = this.videoElement;
    const ctx = this.ctx;
    const canvas = this.canvas;

    if (!video || !ctx || !canvas || video.readyState < 2) return;

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Extract skin/face luminance center of mass
      let sumX = 0;
      let sumY = 0;
      let count = 0;

      // Sample every 4th pixel for high-speed execution
      for (let y = 10; y < h - 10; y += 4) {
        for (let x = 10; x < w - 10; x += 4) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Simple skin chrominance heuristic in YCbCr approximation
          if (r > 60 && g > 40 && b > 20 && r > b && r - g > 10) {
            sumX += x;
            sumY += y;
            count++;
          }
        }
      }

      if (count > 50) {
        const centroidX = sumX / count;
        const centroidY = sumY / count;

        // Offset from frame center normalized to degrees
        const normX = (centroidX - w / 2) / (w / 2); // -1 to +1
        const normY = (centroidY - h / 2) / (h / 2); // -1 to +1

        const estYaw = -normX * 45; // Turning head shifts face centroid in camera
        const estPitch = normY * 30;

        this.applyAngles(estYaw, estPitch, 0);
      }
    } catch {
      // Ignore frame read failures
    }
  }
}
