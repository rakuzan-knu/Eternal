/**
 * Floating Reaction Emotes Particle Physics Engine
 *
 * Simulates buoyant upward particle physics with sinusoidal swaying,
 * scale pop-in, alpha decay, and zero-idle CPU overhead.
 */

export interface ReactionParticle {
  id: string;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  swayOmega: number;
  swayAmp: number;
  scale: number;
  targetScale: number;
  rotation: number;
  vRot: number;
  opacity: number;
  ageMs: number;
  lifetimeMs: number;
}

export class ReactionParticleEngine {
  private particles: ReactionParticle[] = [];
  public onSpawn?: (
    emoji: string,
    canvasWidth: number,
    canvasHeight: number,
    startXRatio?: number,
  ) => void;

  public setOnSpawn(
    callback?: (
      emoji: string,
      canvasWidth: number,
      canvasHeight: number,
      startXRatio?: number,
    ) => void,
  ): () => void {
    this.onSpawn = callback;
    return () => {
      if (this.onSpawn === callback) {
        this.onSpawn = undefined;
      }
    };
  }

  /**
   * Spawns a burst of reaction particles
   * @param emoji The emoji character (e.g. '❤️', '🔥', '👏')
   * @param canvasWidth Viewport width in pixels
   * @param canvasHeight Viewport height in pixels
   * @param startXRatio Optional horizontal ratio [0.1, 0.9]
   */
  public spawn(
    emoji: string,
    canvasWidth: number,
    canvasHeight: number,
    startXRatio?: number,
  ): void {
    if (this.onSpawn) {
      this.onSpawn(emoji, canvasWidth, canvasHeight, startXRatio);
    }
    const count = 3 + Math.floor(Math.random() * 3); // 3-5 particles per reaction
    const baseRatio = startXRatio !== undefined ? startXRatio : 0.3 + Math.random() * 0.4;
    const spawnX = baseRatio * canvasWidth;
    const spawnY = canvasHeight - 20;

    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 60;
      const vy = -(180 + Math.random() * 120); // 180 - 300 px/sec upward
      const vx = (Math.random() - 0.5) * 40;

      this.particles.push({
        id: `${Date.now()}-${Math.random()}`,
        emoji,
        x: spawnX + offsetX,
        y: spawnY + (Math.random() - 0.5) * 20,
        vx,
        vy,
        swayOmega: 3 + Math.random() * 3, // Sway cycles per sec
        swayAmp: 15 + Math.random() * 20, // Sway amplitude in px
        scale: 0.2,
        targetScale: 1.0 + Math.random() * 0.4, // 1.0 - 1.4
        rotation: (Math.random() - 0.5) * 0.3,
        vRot: (Math.random() - 0.5) * 0.8,
        opacity: 1.0,
        ageMs: 0,
        lifetimeMs: 2000 + Math.random() * 800, // 2.0 - 2.8s
      });
    }
  }

  /**
   * Updates particle positions and states based on delta time (seconds)
   * @returns boolean indicating if there are still active particles to render
   */
  public update(dtSeconds: number): boolean {
    const dtMs = dtSeconds * 1000;

    this.particles = this.particles.filter((p) => {
      p.ageMs += dtMs;
      if (p.ageMs >= p.lifetimeMs) return false;

      // Upward motion with slight drag
      p.y += p.vy * dtSeconds;
      p.x += p.vx * dtSeconds + Math.sin((p.ageMs / 1000) * p.swayOmega) * (p.swayAmp * dtSeconds);

      // Scale spring
      if (p.scale < p.targetScale) {
        p.scale = Math.min(p.targetScale, p.scale + 6.0 * dtSeconds);
      }

      // Rotation
      p.rotation += p.vRot * dtSeconds;

      // Alpha decay after 60% of lifespan
      const progress = p.ageMs / p.lifetimeMs;
      if (progress > 0.6) {
        p.opacity = Math.max(0, 1.0 - (progress - 0.6) / 0.4);
      }

      return p.opacity > 0;
    });

    return this.particles.length > 0;
  }

  /**
   * Renders active particles onto the canvas
   */
  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.scale(p.scale, p.scale);

      ctx.font = '32px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      ctx.fillText(p.emoji, 0, 0);

      ctx.restore();
    }

    ctx.restore();
  }

  public getActiveCount(): number {
    return this.particles.length;
  }

  public clear(): void {
    this.particles = [];
  }
}
