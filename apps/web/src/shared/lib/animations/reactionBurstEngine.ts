export type ParticleType =
  | 'heart'
  | 'broken_heart'
  | 'star'
  | 'circle'
  | 'spark'
  | 'confetti'
  | 'flame'
  | 'devil'
  | 'ghost'
  | 'lightning'
  | 'tear'
  | 'bubble'
  | 'feather'
  | 'snowflake'
  | 'swirl'
  | 'text'
  | 'kiss'
  | 'pill'
  | 'emoji';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  type: ParticleType;
  text?: string;
  emoji?: string;
  life: number;
  maxLife: number;
  gravity: number;
  wobble?: number;
  wobbleSpeed?: number;
  scale?: number;
  scaleSpeed?: number;
  aspectRatio?: number;
}

export interface FlyingEmoji {
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  targetX: number;
  targetY: number;
  emoji: string;
  startTime: number;
  duration: number;
  onComplete?: () => void;
}

class ReactionBurstEngine {
  private particles: Particle[] = [];
  private flyingEmojis: FlyingEmoji[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private dpr = 1;

  public attachCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  public detachCanvas() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.flyingEmojis = [];
  }

  public resize() {
    if (!this.canvas || !this.ctx) return;
    this.dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  public triggerBurst(originX: number, originY: number, emoji: string) {
    const count = this.getParticleCount(emoji);
    const newParticles: Particle[] = new Array<Particle>(count);

    for (let i = 0; i < count; i++) {
      newParticles[i] = this.createParticle(originX, originY, emoji, i, count);
    }

    this.particles.push(...newParticles);
    this.ensureAnimationLoop();
  }

  public triggerFlyingEmoji(
    from: { x: number; y: number },
    to: { x: number; y: number },
    emoji: string,
    onComplete?: () => void,
  ) {
    const midX = (from.x + to.x) / 2;
    const midY = Math.min(from.y, to.y) - Math.max(70, Math.abs(to.x - from.x) * 0.25);

    this.flyingEmojis.push({
      startX: from.x,
      startY: from.y,
      controlX: midX,
      controlY: midY,
      targetX: to.x,
      targetY: to.y,
      emoji,
      startTime: performance.now(),
      duration: 380,
      onComplete,
    });

    this.ensureAnimationLoop();
  }

  private ensureAnimationLoop() {
    if (this.animationFrameId === null) {
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  }

  private loop = (now: number) => {
    if (!this.ctx || !this.canvas) {
      this.animationFrameId = null;
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.ctx.clearRect(0, 0, width, height);

    // 1. Update & Render Flying Emojis
    for (let i = this.flyingEmojis.length - 1; i >= 0; i--) {
      const fe = this.flyingEmojis[i];
      const elapsed = now - fe.startTime;
      const progress = Math.min(1, elapsed / fe.duration);

      const t = this.easeOutQuad(progress);
      const oneMinusT = 1 - t;
      const x =
        oneMinusT * oneMinusT * fe.startX + 2 * oneMinusT * t * fe.controlX + t * t * fe.targetX;
      const y =
        oneMinusT * oneMinusT * fe.startY + 2 * oneMinusT * t * fe.controlY + t * t * fe.targetY;

      const scale = 1 + Math.sin(progress * Math.PI) * 0.45;
      const rotation = (t - 0.5) * 0.35;

      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(rotation);
      this.ctx.scale(scale, scale);
      this.ctx.font = '26px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(fe.emoji, 0, 0);
      this.ctx.restore();

      if (progress >= 1) {
        this.flyingEmojis.splice(i, 1);
        if (fe.onComplete) {
          fe.onComplete();
        }
        this.triggerBurst(fe.targetX, fe.targetY, fe.emoji);
      }
    }

    // 2. Update & Render Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.life -= 0.022;
      p.alpha = Math.max(0, p.life / p.maxLife);

      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;

      if (p.wobble !== undefined && p.wobbleSpeed !== undefined) {
        p.wobble += p.wobbleSpeed;
        p.x += Math.sin(p.wobble) * 0.8;
      }

      p.rotation += p.rotationSpeed;

      if (p.scale !== undefined && p.scaleSpeed !== undefined) {
        p.scale = Math.max(0, p.scale + p.scaleSpeed);
      }

      if (p.life <= 0 || p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.drawParticle(this.ctx, p);
    }

    // 3. Keep running or stop animation loop when idle
    if (this.particles.length > 0 || this.flyingEmojis.length > 0) {
      this.animationFrameId = requestAnimationFrame(this.loop);
    } else {
      this.ctx.clearRect(0, 0, width, height);
      this.animationFrameId = null;
    }
  };

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = p.alpha;

    const scale = p.scale ?? 1;

    switch (p.type) {
      case 'heart': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const r = (p.size * scale) / 2;
        ctx.moveTo(0, r * 0.4);
        ctx.bezierCurveTo(-r, -r * 0.6, -r * 1.6, r * 0.4, 0, r * 1.5);
        ctx.bezierCurveTo(r * 1.6, r * 0.4, r, -r * 0.6, 0, r * 0.4);
        ctx.fill();
        break;
      }
      case 'broken_heart': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const r = (p.size * scale) / 2;
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.8, -r * 0.5);
        ctx.lineTo(r, r * 0.3);
        ctx.lineTo(0, r * 1.4);
        ctx.lineTo(-r * 0.3, r * 0.5);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'flame': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const r = (p.size * scale) / 2;
        ctx.moveTo(0, -r * 1.3);
        ctx.quadraticCurveTo(r * 1.2, 0, 0, r * 1.3);
        ctx.quadraticCurveTo(-r * 1.2, 0, 0, -r * 1.3);
        ctx.fill();
        break;
      }
      case 'devil': {
        // Demonic flame & imp silhouette
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const r = (p.size * scale) / 2;
        ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
        ctx.fill();
        // Little horns
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, -r * 0.4);
        ctx.lineTo(-r * 0.9, -r * 1.3);
        ctx.lineTo(-r * 0.2, -r * 0.7);
        ctx.moveTo(r * 0.6, -r * 0.4);
        ctx.lineTo(r * 0.9, -r * 1.3);
        ctx.lineTo(r * 0.2, -r * 0.7);
        ctx.fill();
        break;
      }
      case 'lightning': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const s = p.size * scale;
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.5, -s * 0.1);
        ctx.lineTo(s * 0.1, -s * 0.1);
        ctx.lineTo(s * 0.4, s);
        ctx.lineTo(-s * 0.5, s * 0.1);
        ctx.lineTo(-s * 0.1, s * 0.1);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'tear': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const r = (p.size * scale) / 2;
        ctx.arc(0, r * 0.4, r * 0.8, 0, Math.PI);
        ctx.lineTo(0, -r * 1.2);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'ghost': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const r = (p.size * scale) / 2;
        ctx.arc(0, -r * 0.5, r * 0.8, Math.PI, 0, false);
        ctx.lineTo(r * 0.8, r);
        ctx.lineTo(r * 0.3, r * 0.7);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.3, r * 0.7);
        ctx.lineTo(-r * 0.8, r);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'kiss': {
        ctx.fillStyle = p.color;
        const r = (p.size * scale) / 2;
        ctx.beginPath();
        ctx.ellipse(-r * 0.4, 0, r * 0.6, r * 0.3, -0.2, 0, Math.PI * 2);
        ctx.ellipse(r * 0.4, 0, r * 0.6, r * 0.3, 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'pill': {
        const w = p.size * scale;
        const h = w * 0.45;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, h / 2);
        ctx.fill();
        // Cap split
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w / 2, h, [h / 2, 0, 0, h / 2]);
        ctx.fill();
        break;
      }
      case 'snowflake': {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.2, 1.8 * scale);
        const s = p.size * scale;
        for (let a = 0; a < 3; a++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath();
          ctx.moveTo(-s, 0);
          ctx.lineTo(s, 0);
          ctx.stroke();
        }
        break;
      }
      case 'feather': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const r = (p.size * scale) / 2;
        ctx.ellipse(0, 0, r * 0.35, r * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'confetti': {
        ctx.fillStyle = p.color;
        const w = p.size * scale * Math.cos(p.rotation * 1.5);
        const h = p.size * scale * (p.aspectRatio ?? 1.6);
        ctx.fillRect(-w / 2, -h / 2, w, h);
        break;
      }
      case 'star': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const outer = p.size * scale;
        const inner = outer * 0.32;
        for (let j = 0; j < 4; j++) {
          const angle = (j * Math.PI) / 2;
          const nextAngle = angle + Math.PI / 4;
          if (j === 0) ctx.moveTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
          else ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
          ctx.lineTo(Math.cos(nextAngle) * inner, Math.sin(nextAngle) * inner);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'bubble':
      case 'circle': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, (p.size * scale) / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'spark': {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, (p.size * scale) / 2), 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'text': {
        if (p.text) {
          ctx.fillStyle = p.color;
          ctx.font = `bold ${Math.round(p.size * scale)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.text, 0, 0);
        }
        break;
      }
      case 'emoji': {
        if (p.emoji) {
          ctx.font = `${Math.round(p.size * scale)}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.emoji, 0, 0);
        }
        break;
      }
    }

    ctx.restore();
  }

  private getParticleCount(emoji: string): number {
    if (emoji === '🎉' || emoji === '🥳' || emoji === '🍾' || emoji === '🤯') return 28;
    if (emoji === '🔥' || emoji === '❤️‍🔥' || emoji === '😈' || emoji === '⚡') return 22;
    if (emoji === '❤️' || emoji === '💔' || emoji === '😭' || emoji === '🦄') return 20;
    if (emoji === '🏆' || emoji === '⭐' || emoji === '💯' || emoji === '😎') return 18;
    return 16;
  }

  private createParticle(
    originX: number,
    originY: number,
    emoji: string,
    index: number,
    total: number,
  ): Particle {
    // 1. Demonic / Devil Imp
    if (emoji === '😈' || emoji === '👿') {
      const colors = ['#a855f7', '#8b5cf6', '#22c55e', '#10b981', '#06b6d4', '#ec4899', '#38bdf8'];
      const angle = (index / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 2.8 + Math.random() * 3.8;
      const isImp = index % 3 === 0;

      return {
        x: originX + (Math.random() - 0.5) * 16,
        y: originY + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: isImp ? 13 + Math.random() * 6 : 5 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: (Math.random() - 0.5) * 0.6,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        type: isImp ? 'devil' : index % 2 === 0 ? 'flame' : 'spark',
        life: 1.1,
        maxLife: 1.1,
        gravity: -0.02,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.1 + Math.random() * 0.08,
      };
    }

    // 2. Broken Heart
    if (emoji === '💔') {
      const colors = ['#dc2626', '#b91c1c', '#7f1d1d', '#4b5563', '#1f2937'];
      const isLeft = index % 2 === 0;
      const angle = isLeft
        ? Math.PI * 1.15 + (Math.random() - 0.5) * 0.5
        : -Math.PI * 0.15 + (Math.random() - 0.5) * 0.5;
      const speed = 3.0 + Math.random() * 3.5;

      return {
        x: originX + (isLeft ? -4 : 4),
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.0,
        size: 10 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: (Math.random() - 0.5) * 0.8,
        rotationSpeed: (isLeft ? -1 : 1) * (0.08 + Math.random() * 0.08),
        type: 'broken_heart',
        life: 1,
        maxLife: 1,
        gravity: 0.16,
      };
    }

    // 3. Lightning / Zap
    if (emoji === '⚡') {
      const colors = ['#facc15', '#fef08a', '#38bdf8', '#ffffff', '#e0f2fe'];
      const angle = Math.random() * Math.PI * 2;
      const speed = 4.0 + Math.random() * 4.5;

      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.0,
        size: 9 + Math.random() * 9,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        type: index % 2 === 0 ? 'lightning' : 'spark',
        life: 0.9,
        maxLife: 0.9,
        gravity: 0.04,
      };
    }

    // 4. Champagne Pop / Celebration
    if (emoji === '🍾') {
      const colors = ['#fde047', '#fef08a', '#ffffff', '#67e8f9', '#a5f3fc', '#f59e0b'];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      const speed = 4.5 + Math.random() * 5.0;

      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed * 0.8,
        vy: Math.sin(angle) * speed - 3.8,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        type: index === 0 ? 'confetti' : index % 3 === 0 ? 'bubble' : 'spark',
        life: 1.1,
        maxLife: 1.1,
        gravity: 0.15,
      };
    }

    // 5. Crying / Tears
    if (emoji === '😭' || emoji === '😢' || emoji === '🥺') {
      const colors = ['#38bdf8', '#60a5fa', '#93c5fd', '#bae6fd', '#ffffff'];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
      const speed = 3.5 + Math.random() * 3.8;

      return {
        x: originX + (Math.random() - 0.5) * 14,
        y: originY + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.0,
        size: 8 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: (Math.random() - 0.5) * 0.4,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        type: 'tear',
        life: 1.1,
        maxLife: 1.1,
        gravity: 0.22, // falls down like rain
      };
    }

    // 6. Mind Blown
    if (emoji === '🤯') {
      const colors = ['#f97316', '#ef4444', '#facc15', '#fbbf24', '#ffffff', '#a855f7'];
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.8 + Math.random() * 4.8;

      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.8,
        size: 7 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        type: index % 2 === 0 ? 'flame' : 'spark',
        life: 1,
        maxLife: 1,
        gravity: 0.08,
      };
    }

    // 7. Swearing / Cursing
    if (emoji === '🤬') {
      const symbols = ['#', '!', '$', '%', '&', '@', '?'];
      const colors = ['#ef4444', '#dc2626', '#f97316', '#fbbf24', '#1f2937'];
      const angle = (index / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 3.2 + Math.random() * 3.8;

      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.0,
        size: 13 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: (Math.random() - 0.5) * 0.8,
        rotationSpeed: (Math.random() - 0.5) * 0.18,
        type: 'text',
        text: symbols[Math.floor(Math.random() * symbols.length)],
        life: 1,
        maxLife: 1,
        gravity: 0.12,
      };
    }

    // 8. Ghost
    if (emoji === '👻') {
      const colors = ['#f8fafc', '#e2e8f0', '#94a3b8', '#67e8f9', '#a5f3fc'];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 2.0 + Math.random() * 2.8;

      return {
        x: originX + (Math.random() - 0.5) * 16,
        y: originY + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: 14 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.85,
        rotation: (Math.random() - 0.5) * 0.4,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        type: 'ghost',
        life: 1.2,
        maxLife: 1.2,
        gravity: -0.05,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.08 + Math.random() * 0.06,
      };
    }

    // 9. Peace Dove
    if (emoji === '🕊️') {
      const colors = ['#ffffff', '#f1f5f9', '#fef08a', '#e2e8f0'];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
      const speed = 2.2 + Math.random() * 2.8;

      return {
        x: originX + (Math.random() - 0.5) * 14,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.2,
        size: 11 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: (Math.random() - 0.5) * 0.8,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        type: 'feather',
        life: 1.2,
        maxLife: 1.2,
        gravity: 0.03,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.08,
      };
    }

    // 10. Winter / Holiday
    if (emoji === '🎄' || emoji === '☃️' || emoji === '❄️') {
      const colors = ['#ffffff', '#bae6fd', '#38bdf8', '#34d399', '#f87171', '#facc15'];
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.4 + Math.random() * 3.4;

      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.8,
        size: 8 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        type: index % 2 === 0 ? 'snowflake' : 'spark',
        life: 1.1,
        maxLife: 1.1,
        gravity: 0.06,
      };
    }

    // 11. Unicorn / Rainbow
    if (emoji === '🦄') {
      const colors = ['#ec4899', '#a855f7', '#38bdf8', '#34d399', '#facc15', '#fb923c', '#ffffff'];
      const angle = (index / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = 3.0 + Math.random() * 3.8;

      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: 7 + Math.random() * 8,
        color: colors[index % colors.length],
        alpha: 1,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        type: index % 3 === 0 ? 'star' : 'spark',
        scale: 0.3,
        scaleSpeed: 0.03,
        life: 1.1,
        maxLife: 1.1,
        gravity: 0.08,
      };
    }

    // 12. Pill / Medicine
    if (emoji === '💊') {
      const colors = ['#ef4444', '#facc15', '#38bdf8', '#a855f7'];
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.8 + Math.random() * 3.5;

      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.2,
        size: 13 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        type: 'pill',
        life: 1.1,
        maxLife: 1.1,
        gravity: 0.14,
      };
    }

    // 13. Kiss / Lips
    if (emoji === '💋' || emoji === '😘' || emoji === '🥰') {
      const colors = ['#e11d48', '#f43f5e', '#fb7185', '#fda4af', '#ffffff'];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.3;
      const speed = 2.8 + Math.random() * 3.4;

      return {
        x: originX + (Math.random() - 0.5) * 14,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: 11 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: (Math.random() - 0.5) * 0.6,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        type: index % 2 === 0 ? 'kiss' : 'heart',
        life: 1,
        maxLife: 1,
        gravity: 0.06,
      };
    }

    // 14. Sleep / Zzz
    if (emoji === '😴' || emoji === '💤') {
      const colors = ['#a855f7', '#c084fc', '#e9d5ff', '#38bdf8', '#ffffff'];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const speed = 1.8 + Math.random() * 2.2;

      return {
        x: originX + (Math.random() - 0.5) * 16,
        y: originY,
        vx: Math.cos(angle) * speed + 0.6,
        vy: Math.sin(angle) * speed - 2.0,
        size: 12 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: (Math.random() - 0.5) * 0.3,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        type: 'text',
        text: 'Z',
        life: 1.2,
        maxLife: 1.2,
        gravity: -0.04,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.06,
      };
    }

    // 15. Whale / Water splash
    if (emoji === '🐳' || emoji === '🐋' || emoji === '🌊') {
      const colors = ['#0284c7', '#38bdf8', '#7dd3fc', '#bae6fd', '#ffffff'];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.7;
      const speed = 4.2 + Math.random() * 4.0;

      return {
        x: originX + (Math.random() - 0.5) * 10,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.8,
        size: 6 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: (Math.random() - 0.5) * 0.4,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        type: 'bubble',
        life: 1.1,
        maxLife: 1.1,
        gravity: 0.2,
      };
    }

    // 16. Heart & Heart on Fire
    if (emoji === '❤️' || emoji === '❤️‍🔥' || emoji === '💖' || emoji === '💗') {
      const colors =
        emoji === '❤️‍🔥'
          ? ['#ff2d55', '#ff3b30', '#ff9500', '#ffcc00', '#ffffff']
          : ['#ff2d55', '#ff375f', '#ff6b8b', '#ff94aa', '#ffffff', '#fda4af'];
      const isMiniHeart = index % 2 === 0;
      const angle = Math.PI * 1.1 + (index / total) * Math.PI * 0.8 + (Math.random() - 0.5) * 0.4;
      const speed = 2.4 + Math.random() * 3.6;

      return {
        x: originX + (Math.random() - 0.5) * 12,
        y: originY + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed * 1.2,
        vy: Math.sin(angle) * speed - 2.8,
        size: isMiniHeart ? 9 + Math.random() * 5 : 4 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: (Math.random() - 0.5) * 0.6,
        rotationSpeed: (Math.random() - 0.5) * 0.06,
        type: isMiniHeart ? 'heart' : emoji === '❤️‍🔥' ? 'flame' : 'spark',
        life: 1,
        maxLife: 1,
        gravity: 0.07,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.08 + Math.random() * 0.05,
      };
    }

    // 17. Fire
    if (emoji === '🔥') {
      const colors = ['#ff3b30', '#ff9500', '#ffcc00', '#ffe600', '#ff453a'];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
      const speed = 3.2 + Math.random() * 4.2;

      return {
        x: originX + (Math.random() - 0.5) * 16,
        y: originY + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed * 0.8,
        vy: Math.sin(angle) * speed - 2.2,
        size: 7 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: (Math.random() - 0.5) * 0.5,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        type: index % 3 === 0 ? 'flame' : 'spark',
        life: 1,
        maxLife: 1,
        gravity: -0.04,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.12 + Math.random() * 0.08,
      };
    }

    // 18. Confetti / Party
    if (emoji === '🎉' || emoji === '🥳') {
      const colors = [
        '#ff2d55',
        '#5856d6',
        '#34c759',
        '#ffcc00',
        '#007aff',
        '#af52de',
        '#ff9500',
        '#30b0c7',
      ];
      const angle = Math.random() * Math.PI * 2;
      const speed = 3.5 + Math.random() * 4.5;

      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.5,
        size: 5 + Math.random() * 5,
        aspectRatio: 1.4 + Math.random() * 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        type: 'confetti',
        life: 1.1,
        maxLife: 1.1,
        gravity: 0.18,
      };
    }

    // 19. Star / Trophy
    if (emoji === '🏆' || emoji === '⭐' || emoji === '🌟' || emoji === '💯' || emoji === '🫡') {
      const colors = ['#ffd700', '#ffea79', '#ffffff', '#fbbf24', '#f59e0b'];
      const angle = (index / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = 2.2 + Math.random() * 3.8;

      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 8 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.18,
        type: 'star',
        scale: 0.2,
        scaleSpeed: 0.035,
        life: 1,
        maxLife: 1,
        gravity: 0.06,
      };
    }

    // 20. Thumbs Up / Down
    if (emoji === '👍' || emoji === '👎') {
      const colors =
        emoji === '👍'
          ? ['#007aff', '#0ea5e9', '#38bdf8', '#60a5fa', '#93c5fd', '#ffffff']
          : ['#ef4444', '#f97316', '#fb923c', '#fdba74', '#ffffff'];
      const angle = (emoji === '👍' ? -Math.PI / 2 : Math.PI / 2) + (Math.random() - 0.5) * 1.2;
      const speed = 2.8 + Math.random() * 3.5;

      return {
        x: originX + (Math.random() - 0.5) * 12,
        y: originY + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + (emoji === '👍' ? -2.5 : 1.5),
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        type: 'circle',
        life: 1,
        maxLife: 1,
        gravity: emoji === '👍' ? 0.08 : 0.2,
      };
    }

    // 21. Default Emojis
    const isClone = index < 4;
    const colors = ['#a78bfa', '#c084fc', '#e879f9', '#f43f5e', '#38bdf8', '#ffffff'];
    const angle = (index / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const speed = isClone ? 2.2 + Math.random() * 2.5 : 3.0 + Math.random() * 3.5;

    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2.0,
      size: isClone ? 14 : 4 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      rotation: (Math.random() - 0.5) * 0.4,
      rotationSpeed: (Math.random() - 0.5) * 0.12,
      type: isClone ? 'emoji' : 'spark',
      emoji,
      life: 1,
      maxLife: 1,
      gravity: 0.09,
    };
  }

  private easeOutQuad(t: number): number {
    return t * (2 - t);
  }
}

export const reactionBurstEngine = new ReactionBurstEngine();

export function triggerReactionBurst(x: number, y: number, emoji: string) {
  reactionBurstEngine.triggerBurst(x, y, emoji);
}

export function triggerFlyingReaction(
  from: { x: number; y: number },
  to: { x: number; y: number },
  emoji: string,
  onComplete?: () => void,
) {
  reactionBurstEngine.triggerFlyingEmoji(from, to, emoji, onComplete);
}
