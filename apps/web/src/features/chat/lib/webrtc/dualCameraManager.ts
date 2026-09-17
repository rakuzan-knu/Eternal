/**
 * Dual-Camera Mode Engine
 *
 * Capabilities:
 * - Simultaneous dual video input capture (face webcam + secondary document camera / USB microscope / mobile P2P feed).
 * - Canvas compositor supporting:
 *   - 'pip' (Picture-in-Picture): primary stream full frame with secondary stream in floating badge.
 *   - 'side_by_side': horizontal split screen.
 * - Seamless track replacement: uses `sender.replaceTrack(compositeTrack)` on existing WebRTC
 *   peer connection without requiring renegotiation.
 * - Mobile pairing URL generation.
 */

export type DualCameraLayout = 'pip' | 'side_by_side';

export interface DualCameraConfig {
  layout: DualCameraLayout;
  secondaryDeviceId?: string;
  pipPosition?: 'bottom_right' | 'bottom_left' | 'top_right' | 'top_left';
  pipScale?: number; // 0.2 to 0.4
}

export class DualCameraManager {
  private primaryStream: MediaStream | null = null;
  private secondaryStream: MediaStream | null = null;
  private primaryVideo: HTMLVideoElement | null = null;
  private secondaryVideo: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private compositeStream: MediaStream | null = null;
  private compositeTrack: MediaStreamTrack | null = null;
  private animFrameId: number | null = null;

  private layout: DualCameraLayout = 'pip';
  private isActive = false;
  private subscribers = new Set<(active: boolean) => void>();

  public getIsActive(): boolean {
    return this.isActive;
  }

  public getLayout(): DualCameraLayout {
    return this.layout;
  }

  public setLayout(layout: DualCameraLayout): void {
    this.layout = layout;
  }

  /**
   * Start dual camera mode.
   */
  public async startDualCamera(
    primaryStream: MediaStream,
    secondaryDeviceId: string,
    layout: DualCameraLayout = 'pip',
  ): Promise<MediaStreamTrack> {
    this.stopDualCamera();

    this.primaryStream = primaryStream;
    this.layout = layout;

    // 1. Acquire secondary video stream
    this.secondaryStream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: { exact: secondaryDeviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    // 2. Create offscreen video elements for smooth canvas blitting
    this.primaryVideo = document.createElement('video');
    this.primaryVideo.autoplay = true;
    this.primaryVideo.playsInline = true;
    this.primaryVideo.muted = true;
    this.primaryVideo.srcObject = this.primaryStream;
    await this.primaryVideo.play().catch(() => {});

    this.secondaryVideo = document.createElement('video');
    this.secondaryVideo.autoplay = true;
    this.secondaryVideo.playsInline = true;
    this.secondaryVideo.muted = true;
    this.secondaryVideo.srcObject = this.secondaryStream;
    await this.secondaryVideo.play().catch(() => {});

    // 3. Initialize compositing canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.ctx = this.canvas.getContext('2d');

    // 4. Start compositing loop
    this.startCompositingLoop();

    // 5. Capture composite track at 30 FPS
    this.compositeStream = this.canvas.captureStream(30);
    this.compositeTrack = this.compositeStream.getVideoTracks()[0];

    this.isActive = true;
    this.notify(true);

    return this.compositeTrack;
  }

  private startCompositingLoop(): void {
    const render = () => {
      if (!this.ctx || !this.canvas || !this.primaryVideo || !this.secondaryVideo) return;

      const width = this.canvas.width;
      const height = this.canvas.height;

      this.ctx.clearRect(0, 0, width, height);

      if (this.layout === 'pip') {
        // Primary video fills background
        if (this.primaryVideo.readyState >= 2) {
          this.ctx.drawImage(this.primaryVideo, 0, 0, width, height);
        }

        // Secondary video in bottom-right PiP window
        if (this.secondaryVideo.readyState >= 2) {
          const pipW = width * 0.28;
          const pipH = height * 0.28;
          const pipX = width - pipW - 24;
          const pipY = height - pipH - 24;

          this.ctx.save();
          // Rounded corners for PiP
          this.ctx.beginPath();
          this.ctx.roundRect(pipX, pipY, pipW, pipH, 16);
          this.ctx.clip();
          this.ctx.drawImage(this.secondaryVideo, pipX, pipY, pipW, pipH);
          this.ctx.restore();

          // PiP border
          this.ctx.strokeStyle = '#34d399';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.roundRect(pipX, pipY, pipW, pipH, 16);
          this.ctx.stroke();
        }
      } else {
        // Side-by-Side split screen
        const halfW = width / 2;

        if (this.primaryVideo.readyState >= 2) {
          this.ctx.drawImage(this.primaryVideo, 0, 0, halfW, height);
        }
        if (this.secondaryVideo.readyState >= 2) {
          this.ctx.drawImage(this.secondaryVideo, halfW, 0, halfW, height);
        }

        // Split line
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(halfW, 0);
        this.ctx.lineTo(halfW, height);
        this.ctx.stroke();
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);
  }

  /**
   * Stop dual camera and release resources.
   */
  public stopDualCamera(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.secondaryStream?.getTracks().forEach((t) => t.stop());
    this.secondaryStream = null;

    if (this.primaryVideo) {
      this.primaryVideo.pause();
      this.primaryVideo.srcObject = null;
      this.primaryVideo = null;
    }

    if (this.secondaryVideo) {
      this.secondaryVideo.pause();
      this.secondaryVideo.srcObject = null;
      this.secondaryVideo = null;
    }

    this.compositeStream?.getTracks().forEach((t) => t.stop());
    this.compositeStream = null;
    this.compositeTrack = null;
    this.canvas = null;
    this.ctx = null;
    this.primaryStream = null;

    if (this.isActive) {
      this.isActive = false;
      this.notify(false);
    }
  }

  /**
   * Generate QR / mobile pairing URL.
   */
  public getPairingUrl(callId: string): string {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.social';
    return `${origin}/call/pair?callId=${encodeURIComponent(callId)}&device=camera`;
  }

  public subscribe(cb: (active: boolean) => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notify(active: boolean): void {
    this.subscribers.forEach((cb) => {
      try {
        cb(active);
      } catch {
        // Listener error ignore
      }
    });
  }
}

export const globalDualCameraManager = new DualCameraManager();
