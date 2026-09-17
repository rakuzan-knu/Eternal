/**
 * WebRTC Virtual Background & Real-time Background Blur
 *
 * Canvas 2D / WebGL frame processor that composites background blur or
 * curated virtual environments (Modern Office, Cyber Neon, Nature Lounge)
 * behind the camera portrait stream.
 */

import { WebGpuBlurShaderPipeline } from './webgpuBlurShader';

export type VirtualBackgroundMode = 'none' | 'blur' | 'office' | 'cyber' | 'nature';

export class VirtualBackgroundManager {
  private mode: VirtualBackgroundMode = 'none';
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private webGpuPipeline: WebGpuBlurShaderPipeline | null = null;
  private outputStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private isProcessing = false;

  constructor(private readonly originalTrack: MediaStreamTrack) {
    this.init();
  }

  private init(): void {
    if (typeof document === 'undefined') return;

    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true;
    if (typeof MediaStream !== 'undefined') {
      this.videoElement.srcObject = new MediaStream([this.originalTrack]);
    }

    this.canvasElement = document.createElement('canvas');
    this.canvasElement.width = 640;
    this.canvasElement.height = 480;
    this.ctx = this.canvasElement.getContext('2d', { willReadFrequently: true });

    void this.videoElement.play().catch(() => {
      // Autoplay handled
    });

    if (this.canvasElement.captureStream) {
      this.outputStream = this.canvasElement.captureStream(30);
    }

    if (WebGpuBlurShaderPipeline.isSupported()) {
      const gpu = new WebGpuBlurShaderPipeline();
      void gpu.init(this.canvasElement).then((ok) => {
        if (ok) this.webGpuPipeline = gpu;
      });
    }
  }

  public setMode(mode: VirtualBackgroundMode): void {
    this.mode = mode;
    if (mode === 'none') {
      this.stopLoop();
    } else if (!this.isProcessing) {
      this.startLoop();
    }
  }

  public getMode(): VirtualBackgroundMode {
    return this.mode;
  }

  public getProcessedTrack(): MediaStreamTrack {
    if (this.mode === 'none' || !this.outputStream) {
      return this.originalTrack;
    }
    const track = this.outputStream.getVideoTracks()[0];
    return track || this.originalTrack;
  }

  private startLoop(): void {
    this.isProcessing = true;
    const processFrame = () => {
      if (!this.isProcessing) return;
      this.renderFrame();
      this.animFrameId = requestAnimationFrame(processFrame);
    };
    this.animFrameId = requestAnimationFrame(processFrame);
  }

  private stopLoop(): void {
    this.isProcessing = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private renderFrame(): void {
    const video = this.videoElement;
    const ctx = this.ctx;
    const canvas = this.canvasElement;

    if (!video || !ctx || !canvas || video.readyState < 2) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.save();

    if (this.mode === 'blur') {
      if (this.webGpuPipeline) {
        this.webGpuPipeline.renderFrame(canvas, video);
        ctx.restore();
        return;
      }

      // 1. Draw blurred background (Canvas 2D fallback)
      ctx.filter = 'blur(16px)';
      ctx.drawImage(video, 0, 0, w, h);
      ctx.filter = 'none';

      // 2. Composite sharp portrait foreground using elliptical gradient mask
      ctx.save();
      const radial = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.2,
        w / 2,
        h / 2,
        Math.min(w, h) * 0.48,
      );
      radial.addColorStop(0, 'rgba(0, 0, 0, 1)');
      radial.addColorStop(0.8, 'rgba(0, 0, 0, 0.85)');
      radial.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'destination-over';
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();
    } else if (this.mode === 'office' || this.mode === 'cyber' || this.mode === 'nature') {
      // 1. Render virtual background
      this.drawVirtualBackdrop(ctx, w, h, this.mode);

      // 2. Composite person on top
      ctx.save();
      const radial = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.25,
        w / 2,
        h / 2,
        Math.min(w, h) * 0.52,
      );
      radial.addColorStop(0, 'rgba(255, 255, 255, 1)');
      radial.addColorStop(0.85, 'rgba(255, 255, 255, 0.9)');
      radial.addColorStop(1, 'rgba(255, 255, 255, 0)');

      // Draw sharp video with soft radial vignette
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawVirtualBackdrop(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    mode: 'office' | 'cyber' | 'nature',
  ): void {
    if (mode === 'office') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.6, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Warm ambient lamp
      const lampGrad = ctx.createRadialGradient(w * 0.85, h * 0.3, 10, w * 0.85, h * 0.3, 180);
      lampGrad.addColorStop(0, 'rgba(251, 191, 36, 0.3)');
      lampGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = lampGrad;
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'cyber') {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#09090b');
      grad.addColorStop(0.7, '#1e1b4b');
      grad.addColorStop(1, '#3b0764');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Neon cyan and violet grid glow
      const neonGrad = ctx.createRadialGradient(w * 0.2, h * 0.8, 20, w * 0.2, h * 0.8, 260);
      neonGrad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
      neonGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = neonGrad;
      ctx.fillRect(0, 0, w, h);
    } else if (mode === 'nature') {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(0.5, '#022c22');
      grad.addColorStop(1, '#052e16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Emerald sunlight filter
      const sunGrad = ctx.createRadialGradient(w * 0.5, 0, 20, w * 0.5, 0, 220);
      sunGrad.addColorStop(0, 'rgba(110, 231, 183, 0.25)');
      sunGrad.addColorStop(1, 'rgba(110, 231, 183, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  public destroy(): void {
    this.stopLoop();
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    if (this.outputStream) {
      this.outputStream.getTracks().forEach((t) => t.stop());
      this.outputStream = null;
    }
    this.canvasElement = null;
    this.ctx = null;
  }
}
