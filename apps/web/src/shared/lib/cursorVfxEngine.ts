/**
 * Cursor VFX Engine: Ultra-smooth, hardware-accelerated Canvas overlay
 * for rich interactive feedback, cursor trails, 1:1 pixel art click impacts,
 * and tactical hover lock-on animations.
 *
 * Fully respects user preferences:
 * - Only active when custom cursor and VFX are enabled
 * - Supports modular toggles: trails, clicks, hover lock-on
 * - Automatically idles (0% CPU usage) when no particles are alive
 */

import { CURSOR_PRESETS, MINECRAFT_MATERIALS } from './cursorEngine';

export interface CursorVfxOptions {
  enabled: boolean;
  trail: boolean;
  click: boolean;
  hover: boolean;
  presetId: string;
  variantId: string;
}

// ---------------------------------------------------------------------------
// 1. Sprite Generation & Caching (1:1 Pixel Art)
// ---------------------------------------------------------------------------
const spriteCache: Map<string, HTMLCanvasElement> = new Map();

/**
 * Creates an offscreen canvas with disabled smoothing for crisp pixel art.
 */
function createOffscreenCanvas(
  width: number,
  height: number,
): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/**
 * Generates an authentic 3D Isometric Minecraft Grass Block (16x16)
 * with grass top, dirt sides, hanging pixelated turf overhang, and dark outline.
 */
function getGrassBlockSprite(): HTMLCanvasElement {
  const key = 'mc_grass_block';
  if (spriteCache.has(key)) return spriteCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(18, 18);

  // 1. Outline Base
  ctx.fillStyle = '#1e140a';
  ctx.beginPath();
  ctx.moveTo(9, 1);
  ctx.lineTo(17, 5);
  ctx.lineTo(17, 12);
  ctx.lineTo(9, 17);
  ctx.lineTo(1, 12);
  ctx.lineTo(1, 5);
  ctx.closePath();
  ctx.fill();

  // 2. Top Face: Vibrant Grass Rhombus
  ctx.fillStyle = '#5c8e32';
  ctx.beginPath();
  ctx.moveTo(9, 2);
  ctx.lineTo(16, 5.5);
  ctx.lineTo(9, 9);
  ctx.lineTo(2, 5.5);
  ctx.closePath();
  ctx.fill();

  // Top Face pixel texture details
  ctx.fillStyle = '#73a938';
  ctx.fillRect(8, 3, 2, 2);
  ctx.fillRect(11, 5, 2, 1);
  ctx.fillRect(5, 5, 2, 1);
  ctx.fillStyle = '#4a7527';
  ctx.fillRect(7, 6, 2, 1);
  ctx.fillRect(10, 4, 1, 2);

  // 3. Left Face: Dirt with Grass Overhang
  ctx.fillStyle = '#866043';
  ctx.beginPath();
  ctx.moveTo(2, 6);
  ctx.lineTo(9, 9.5);
  ctx.lineTo(9, 16);
  ctx.lineTo(2, 11.5);
  ctx.closePath();
  ctx.fill();

  // Left dirt texture specks
  ctx.fillStyle = '#573d26';
  ctx.fillRect(3, 8, 2, 2);
  ctx.fillRect(6, 11, 2, 2);
  ctx.fillRect(4, 12, 1, 1);
  ctx.fillStyle = '#9b744f';
  ctx.fillRect(5, 9, 2, 1);

  // Left Face Grass Overhang (jagged turf drops)
  ctx.fillStyle = '#5c8e32';
  ctx.beginPath();
  ctx.moveTo(2, 6);
  ctx.lineTo(9, 9.5);
  ctx.lineTo(9, 11.5);
  ctx.lineTo(7, 10.5);
  ctx.lineTo(6, 12);
  ctx.lineTo(4, 10.5);
  ctx.lineTo(3, 11.5);
  ctx.lineTo(2, 8.5);
  ctx.closePath();
  ctx.fill();

  // 4. Right Face: Shaded Dirt with Shaded Grass Overhang
  ctx.fillStyle = '#60432c';
  ctx.beginPath();
  ctx.moveTo(9, 9.5);
  ctx.lineTo(16, 6);
  ctx.lineTo(16, 11.5);
  ctx.lineTo(9, 16);
  ctx.closePath();
  ctx.fill();

  // Right dirt texture specks
  ctx.fillStyle = '#3d2817';
  ctx.fillRect(11, 10, 2, 2);
  ctx.fillRect(13, 8, 1, 2);
  ctx.fillRect(10, 13, 2, 1);

  // Right Face Shaded Grass Overhang
  ctx.fillStyle = '#446422';
  ctx.beginPath();
  ctx.moveTo(9, 9.5);
  ctx.lineTo(16, 6);
  ctx.lineTo(16, 8.5);
  ctx.lineTo(14, 11.5);
  ctx.lineTo(13, 10);
  ctx.lineTo(11, 12);
  ctx.lineTo(9, 11.5);
  ctx.closePath();
  ctx.fill();

  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * Generates an authentic 3D Isometric Minecraft Oak Log Block (16x16)
 * with concentric wood growth rings on top and textured vertical bark sides.
 */
function getOakLogSprite(): HTMLCanvasElement {
  const key = 'mc_oak_log';
  if (spriteCache.has(key)) return spriteCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(18, 18);

  // 1. Dark Bark Outline
  ctx.fillStyle = '#352514';
  ctx.beginPath();
  ctx.moveTo(9, 1);
  ctx.lineTo(17, 5);
  ctx.lineTo(17, 12);
  ctx.lineTo(9, 17);
  ctx.lineTo(1, 12);
  ctx.lineTo(1, 5);
  ctx.closePath();
  ctx.fill();

  // 2. Top Face: Concentric Oak Rings
  // Outer bark ring
  ctx.fillStyle = '#523c21';
  ctx.beginPath();
  ctx.moveTo(9, 2);
  ctx.lineTo(16, 5.5);
  ctx.lineTo(9, 9);
  ctx.lineTo(2, 5.5);
  ctx.closePath();
  ctx.fill();

  // Intermediate wood ring
  ctx.fillStyle = '#c49a60';
  ctx.beginPath();
  ctx.moveTo(9, 3);
  ctx.lineTo(14.5, 5.5);
  ctx.lineTo(9, 8);
  ctx.lineTo(3.5, 5.5);
  ctx.closePath();
  ctx.fill();

  // Dark growth circle
  ctx.fillStyle = '#9b743f';
  ctx.beginPath();
  ctx.moveTo(9, 4);
  ctx.lineTo(12.5, 5.5);
  ctx.lineTo(9, 7);
  ctx.lineTo(5.5, 5.5);
  ctx.closePath();
  ctx.fill();

  // Center wood heart
  ctx.fillStyle = '#c49a60';
  ctx.fillRect(8, 5, 2, 1);

  // 3. Left Face: Vertical Oak Bark Striations
  ctx.fillStyle = '#6b5232';
  ctx.beginPath();
  ctx.moveTo(2, 6);
  ctx.lineTo(9, 9.5);
  ctx.lineTo(9, 16);
  ctx.lineTo(2, 11.5);
  ctx.closePath();
  ctx.fill();

  // Vertical bark cracks (dark crevices)
  ctx.fillStyle = '#4c3922';
  ctx.fillRect(4, 7, 1, 5);
  ctx.fillRect(6, 9, 1, 5);
  ctx.fillStyle = '#85643e'; // light bark ridge
  ctx.fillRect(5, 8, 1, 4);

  // 4. Right Face: Shaded Vertical Bark
  ctx.fillStyle = '#4c3922';
  ctx.beginPath();
  ctx.moveTo(9, 9.5);
  ctx.lineTo(16, 6);
  ctx.lineTo(16, 11.5);
  ctx.lineTo(9, 16);
  ctx.closePath();
  ctx.fill();

  // Shaded crevices
  ctx.fillStyle = '#352514';
  ctx.fillRect(11, 9, 1, 5);
  ctx.fillRect(14, 7, 1, 5);
  ctx.fillStyle = '#5e4529';
  ctx.fillRect(12, 10, 1, 4);

  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * Generates an authentic Minecraft Critical Hit Particle (Cross-Star)
 * with weapon-matched core, light sparkles, and dark drop outline.
 */
function getCritStarSprite(color: string, glowColor: string): HTMLCanvasElement {
  const key = `crit_${color}`;
  if (spriteCache.has(key)) return spriteCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(10, 10);

  // Dark outline cross
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(4, 1, 2, 8);
  ctx.fillRect(1, 4, 8, 2);
  ctx.fillRect(3, 2, 4, 6);
  ctx.fillRect(2, 3, 6, 4);

  // Colored weapon-matched crit star body
  ctx.fillStyle = color;
  ctx.fillRect(4, 2, 2, 6);
  ctx.fillRect(2, 4, 6, 2);
  ctx.fillRect(3, 3, 4, 4);

  // Highlight core (pure white glint)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(4, 4, 2, 2);
  ctx.fillStyle = glowColor;
  ctx.fillRect(4, 3, 2, 1);
  ctx.fillRect(3, 4, 1, 2);

  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * Generates a 3D Voxel Cube sprite for the 3D Pixel Cursor preset.
 */
function getVoxelCubeSprite(color: string): HTMLCanvasElement {
  const key = `voxel_${color}`;
  if (spriteCache.has(key)) return spriteCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(14, 14);

  // Dark outline
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.beginPath();
  ctx.moveTo(7, 1);
  ctx.lineTo(13, 4);
  ctx.lineTo(13, 9);
  ctx.lineTo(7, 13);
  ctx.lineTo(1, 9);
  ctx.lineTo(1, 4);
  ctx.closePath();
  ctx.fill();

  // Top Face (bright)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 2);
  ctx.lineTo(12, 4.5);
  ctx.lineTo(7, 7);
  ctx.lineTo(2, 4.5);
  ctx.closePath();
  ctx.fill();

  // Left Face (tinted color)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(2, 5);
  ctx.lineTo(7, 7.5);
  ctx.lineTo(7, 12);
  ctx.lineTo(2, 9);
  ctx.closePath();
  ctx.fill();

  // Right Face (darkened)
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.moveTo(7, 7.5);
  ctx.lineTo(12, 5);
  ctx.lineTo(12, 9);
  ctx.lineTo(7, 12);
  ctx.closePath();
  ctx.fill();

  spriteCache.set(key, canvas);
  return canvas;
}

/**
 * Generates an authentic golden last-hit coin for Dota 2.
 */
function getDotaCoinSprite(): HTMLCanvasElement {
  const key = 'dota_coin';
  if (spriteCache.has(key)) return spriteCache.get(key)!;

  const { canvas, ctx } = createOffscreenCanvas(10, 10);
  ctx.fillStyle = '#78350f'; // border
  ctx.beginPath();
  ctx.arc(5, 5, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#facc15'; // gold base
  ctx.beginPath();
  ctx.arc(5, 5, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef08a'; // shine
  ctx.fillRect(4, 2, 2, 2);
  ctx.fillStyle = '#92400e'; // symbol
  ctx.fillRect(4, 5, 2, 2);

  spriteCache.set(key, canvas);
  return canvas;
}

// ---------------------------------------------------------------------------
// 2. Particle Data Structures
// ---------------------------------------------------------------------------
type ParticleKind =
  | 'crit-star'
  | 'grass-block'
  | 'oak-log'
  | 'slash-arc'
  | 'stardust'
  | 'cyber-lock'
  | 'cyber-emp'
  | 'dota-coin'
  | 'voxel-cube';

interface BaseParticle {
  id: number;
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  rotation: number;
  vRot: number;
  scale: number;
  life: number; // 1.0 -> 0.0
  decay: number;
  color: string;
  glowColor?: string;
  extra?: {
    // For Slash Arc
    angle?: number;
    arcLength?: number;
    slashRadius?: number;
    // For Cyber Lock-on
    targetW?: number;
    targetH?: number;
    targetX?: number;
    targetY?: number;
    tagText?: string;
  };
}

// ---------------------------------------------------------------------------
// 3. Engine Core Class
// ---------------------------------------------------------------------------
class CursorVfxEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animId: number | null = null;
  private particles: BaseParticle[] = [];
  private particleSeq = 0;

  private options: CursorVfxOptions = {
    enabled: false,
    trail: false,
    click: false,
    hover: false,
    presetId: 'minecraft-sword',
    variantId: 'diamond',
  };

  private mouseX = 0;
  private mouseY = 0;
  private lastTrailX = 0;
  private lastTrailY = 0;
  private lastMoveTime = 0;
  private isHoveredOnInteractive = false;
  private lastHoveredElement: Element | null = null;

  // Bound event listeners
  private handlePointerMoveBound = this.handlePointerMove.bind(this);
  private handlePointerDownBound = this.handlePointerDown.bind(this);
  private handleResizeBound = this.handleResize.bind(this);

  /**
   * Initializes or updates engine options.
   */
  public configure(opts: Partial<CursorVfxOptions>): void {
    const wasActive = this.isActive();
    this.options = { ...this.options, ...opts };
    const nowActive = this.isActive();

    if (nowActive && !wasActive) {
      this.start();
    } else if (!nowActive && wasActive) {
      this.stop();
    }
  }

  private isActive(): boolean {
    return this.options.enabled && (this.options.trail || this.options.click || this.options.hover);
  }

  private start(): void {
    if (typeof window === 'undefined') return;

    if (!this.canvas) {
      const c = document.createElement('canvas');
      c.id = 'cursor-vfx-canvas';
      c.style.position = 'fixed';
      c.style.inset = '0';
      c.style.width = '100vw';
      c.style.height = '100vh';
      c.style.pointerEvents = 'none';
      c.style.zIndex = '999999';
      document.body.appendChild(c);
      this.canvas = c;
      this.ctx = c.getContext('2d');
    }

    this.handleResize();

    window.addEventListener('pointermove', this.handlePointerMoveBound, { passive: true });
    window.addEventListener('pointerdown', this.handlePointerDownBound, { passive: true });
    window.addEventListener('resize', this.handleResizeBound, { passive: true });

    this.resumeLoop();
  }

  private stop(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('pointermove', this.handlePointerMoveBound);
    window.removeEventListener('pointerdown', this.handlePointerDownBound);
    window.removeEventListener('resize', this.handleResizeBound);

    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    this.particles = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private handleResize(): void {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.ctx.imageSmoothingEnabled = false;
  }

  private resumeLoop(): void {
    if (!this.animId && this.isActive()) {
      this.animId = requestAnimationFrame(this.loop.bind(this));
    }
  }

  // -------------------------------------------------------------------------
  // Event Handlers
  // -------------------------------------------------------------------------
  private handlePointerMove(e: PointerEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    const now = performance.now();
    const dt = Math.max(1, now - this.lastMoveTime);
    this.lastMoveTime = now;

    const dx = this.mouseX - this.lastTrailX;
    const dy = this.mouseY - this.lastTrailY;
    const dist = Math.hypot(dx, dy);
    const speed = dist / dt; // px per ms

    // 1. Trail Generation
    if (this.options.trail && dist > 12) {
      this.spawnTrailParticle(this.mouseX, this.mouseY, dx, dy, speed);
      this.lastTrailX = this.mouseX;
      this.lastTrailY = this.mouseY;
      this.resumeLoop();
    }

    // 2. High-speed Katana Slash wake on swift gesture
    if (this.options.trail && this.options.presetId === 'katana' && speed > 2.0 && dist > 35) {
      this.spawnKatanaSlash(this.mouseX, this.mouseY, Math.atan2(dy, dx), 45);
      this.resumeLoop();
    }

    // 3. Hover / Lock-on detection
    if (this.options.hover) {
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const interactive = target?.closest(
        'button, a, input, select, textarea, [role="button"], [role="tab"], [role="switch"], [data-hover-interactive]',
      );

      if (interactive && interactive !== this.lastHoveredElement) {
        this.lastHoveredElement = interactive;
        this.spawnHoverReaction(interactive);
        this.resumeLoop();
      } else if (!interactive) {
        this.lastHoveredElement = null;
      }
    }
  }

  private handlePointerDown(e: PointerEvent): void {
    if (!this.options.click) return;
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.spawnClickImpact(e.clientX, e.clientY);
    this.resumeLoop();
  }

  // -------------------------------------------------------------------------
  // Effects Spawning
  // -------------------------------------------------------------------------
  private getThemeColor(): { color: string; glow: string } {
    const { presetId, variantId } = this.options;
    if (presetId.startsWith('minecraft-')) {
      const m = MINECRAFT_MATERIALS.find((mat) => mat.id === variantId) || MINECRAFT_MATERIALS[0];
      return { color: m.mid, glow: m.glowColor };
    }
    const preset = CURSOR_PRESETS.find((p) => p.id === presetId);
    const v = preset?.variants.find((vr) => vr.id === variantId) || preset?.variants[0];
    return {
      color: v?.color || '#8b5cf6',
      glow: v?.glowColor || 'rgba(139, 92, 246, 0.5)',
    };
  }

  /**
   * Spawns signature click impacts tailored to each cursor preset.
   */
  private spawnClickImpact(x: number, y: number): void {
    const { presetId } = this.options;
    const { color, glow } = this.getThemeColor();

    switch (presetId) {
      case 'minecraft-sword': {
        // Critical Hit Particles: 10 authentic cross-stars exploding outwards with gravity
        const count = 10;
        for (let i = 0; i < count; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
          const speed = 2.5 + Math.random() * 4.5;
          this.particles.push({
            id: ++this.particleSeq,
            kind: 'crit-star',
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 6,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.22,
            drag: 0.95,
            rotation: (Math.random() - 0.5) * 0.4,
            vRot: (Math.random() - 0.5) * 0.08,
            scale: 1.0 + Math.random() * 0.5,
            life: 1.0,
            decay: 0.024 + Math.random() * 0.015,
            color,
            glowColor: glow,
          });
        }
        break;
      }

      case 'minecraft-pickaxe': {
        // 3D Isometric Grass Blocks: exactly 6 to 8 miniature blocks popping and tumbling
        const count = 7;
        for (let i = 0; i < count; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
          const speed = 3.0 + Math.random() * 4.0;
          this.particles.push({
            id: ++this.particleSeq,
            kind: 'grass-block',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.28,
            drag: 0.96,
            rotation: (Math.random() - 0.5) * 0.5,
            vRot: (Math.random() - 0.5) * 0.12,
            scale: 0.85 + Math.random() * 0.35,
            life: 1.0,
            decay: 0.022 + Math.random() * 0.01,
            color: '#5c8e32',
          });
        }
        break;
      }

      case 'minecraft-axe': {
        // 3D Isometric Oak Log Blocks: exactly 6 to 8 miniature wood blocks popping and tumbling
        const count = 7;
        for (let i = 0; i < count; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
          const speed = 3.0 + Math.random() * 4.0;
          this.particles.push({
            id: ++this.particleSeq,
            kind: 'oak-log',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.28,
            drag: 0.96,
            rotation: (Math.random() - 0.5) * 0.5,
            vRot: (Math.random() - 0.5) * 0.12,
            scale: 0.85 + Math.random() * 0.35,
            life: 1.0,
            decay: 0.022 + Math.random() * 0.01,
            color: '#6b5232',
          });
        }
        break;
      }

      case 'katana': {
        // Fast Semi-transparent Slash Arc sweeping across the click point
        const slashAngle = -Math.PI / 4 + (Math.random() - 0.5) * 0.5;
        this.spawnKatanaSlash(x, y, slashAngle, 70);

        // Accompanying sparks
        for (let i = 0; i < 6; i++) {
          const angle = slashAngle + (Math.random() - 0.5) * Math.PI * 0.8;
          const spd = 3.5 + Math.random() * 3.5;
          this.particles.push({
            id: ++this.particleSeq,
            kind: 'crit-star',
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            gravity: 0.15,
            drag: 0.94,
            rotation: Math.random() * Math.PI,
            vRot: 0.1,
            scale: 0.7,
            life: 1.0,
            decay: 0.04,
            color: '#ffffff',
            glowColor: color,
          });
        }
        break;
      }

      case 'magic-wand': {
        // Magical Nova Burst: 14 glittering twinkle stars expanding radially
        const count = 14;
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
          const speed = 2.0 + Math.random() * 3.5;
          this.particles.push({
            id: ++this.particleSeq,
            kind: 'stardust',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: -0.04, // slight float upward
            drag: 0.95,
            rotation: Math.random() * Math.PI,
            vRot: (Math.random() - 0.5) * 0.15,
            scale: 0.9 + Math.random() * 0.6,
            life: 1.0,
            decay: 0.025 + Math.random() * 0.015,
            color,
            glowColor: glow,
          });
        }
        break;
      }

      case 'cyberpunk-crosshair': {
        // Tactical EMP Shockwave + Glitch bit-burst
        this.particles.push({
          id: ++this.particleSeq,
          kind: 'cyber-emp',
          x,
          y,
          vx: 0,
          vy: 0,
          gravity: 0,
          drag: 1,
          rotation: 0,
          vRot: 0,
          scale: 0.2,
          life: 1.0,
          decay: 0.045,
          color,
          glowColor: glow,
        });

        // 8 glitch pixel bits
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const spd = 3.0 + Math.random() * 2.0;
          this.particles.push({
            id: ++this.particleSeq,
            kind: 'crit-star',
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            gravity: 0,
            drag: 0.92,
            rotation: 0,
            vRot: 0,
            scale: 0.7,
            life: 1.0,
            decay: 0.05,
            color,
            glowColor: glow,
          });
        }
        break;
      }

      case 'dota2': {
        // Last-hit Gold Coin burst
        for (let i = 0; i < 5; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
          const speed = 2.5 + Math.random() * 3.5;
          this.particles.push({
            id: ++this.particleSeq,
            kind: 'dota-coin',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.22,
            drag: 0.96,
            rotation: (Math.random() - 0.5) * 0.5,
            vRot: (Math.random() - 0.5) * 0.1,
            scale: 0.9,
            life: 1.0,
            decay: 0.025,
            color: '#fbbf24',
          });
        }
        break;
      }

      case 'pixel-3d': {
        // Mini Voxel cubes burst
        for (let i = 0; i < 6; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
          const speed = 2.5 + Math.random() * 3.5;
          this.particles.push({
            id: ++this.particleSeq,
            kind: 'voxel-cube',
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.24,
            drag: 0.95,
            rotation: (Math.random() - 0.5) * 0.4,
            vRot: (Math.random() - 0.5) * 0.1,
            scale: 0.9,
            life: 1.0,
            decay: 0.025,
            color,
          });
        }
        break;
      }
    }
  }

  /**
   * Spawns a glowing Katana Slash Arc.
   */
  private spawnKatanaSlash(x: number, y: number, angle: number, radius = 60): void {
    const { color, glow } = this.getThemeColor();
    this.particles.push({
      id: ++this.particleSeq,
      kind: 'slash-arc',
      x,
      y,
      vx: 0,
      vy: 0,
      gravity: 0,
      drag: 1,
      rotation: angle,
      vRot: 0,
      scale: 1.0,
      life: 1.0,
      decay: 0.055, // rapid ~250ms fade
      color,
      glowColor: glow,
      extra: {
        angle,
        slashRadius: radius,
        arcLength: Math.PI * 0.7,
      },
    });
  }

  /**
   * Spawns trail particles matching current cursor.
   */
  private spawnTrailParticle(x: number, y: number, dx: number, dy: number, speed: number): void {
    const { presetId } = this.options;
    const { color, glow } = this.getThemeColor();

    if (presetId === 'magic-wand') {
      // Stardust Trail: gentle floating twinkle stars
      this.particles.push({
        id: ++this.particleSeq,
        kind: 'stardust',
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: -dx * 0.08 + (Math.random() - 0.5) * 0.8,
        vy: -dy * 0.08 - 0.5 + (Math.random() - 0.5) * 0.5,
        gravity: -0.02,
        drag: 0.94,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.1,
        scale: 0.75 + Math.random() * 0.4,
        life: 1.0,
        decay: 0.035,
        color,
        glowColor: glow,
      });
    } else if (presetId.startsWith('minecraft-')) {
      // Subtle weapon dust/spark
      this.particles.push({
        id: ++this.particleSeq,
        kind: 'crit-star',
        x,
        y,
        vx: -dx * 0.05 + (Math.random() - 0.5) * 0.5,
        vy: -dy * 0.05 + (Math.random() - 0.5) * 0.5,
        gravity: 0.08,
        drag: 0.94,
        rotation: 0,
        vRot: 0,
        scale: 0.5,
        life: 0.7,
        decay: 0.045,
        color,
        glowColor: glow,
      });
    } else if (presetId === 'cyberpunk-crosshair') {
      // Neon digital dot
      this.particles.push({
        id: ++this.particleSeq,
        kind: 'crit-star',
        x,
        y,
        vx: -dx * 0.04,
        vy: -dy * 0.04,
        gravity: 0,
        drag: 0.95,
        rotation: 0,
        vRot: 0,
        scale: 0.45,
        life: 0.8,
        decay: 0.05,
        color,
        glowColor: glow,
      });
    } else if (presetId === 'katana') {
      // Steel reflection spark
      this.particles.push({
        id: ++this.particleSeq,
        kind: 'crit-star',
        x,
        y,
        vx: -dx * 0.04,
        vy: -dy * 0.04,
        gravity: 0.05,
        drag: 0.95,
        rotation: Math.random() * Math.PI,
        vRot: 0.1,
        scale: 0.55,
        life: 0.8,
        decay: 0.045,
        color: '#ffffff',
        glowColor: color,
      });
    }
  }

  /**
   * Spawns tactical Lock-on Ping when hovering interactive elements.
   */
  private spawnHoverReaction(el: Element): void {
    const { presetId } = this.options;
    const { color, glow } = this.getThemeColor();
    const rect = el.getBoundingClientRect();

    if (presetId === 'cyberpunk-crosshair') {
      // Holographic Lock-on HUD brackets
      this.particles.push({
        id: ++this.particleSeq,
        kind: 'cyber-lock',
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        vx: 0,
        vy: 0,
        gravity: 0,
        drag: 1,
        rotation: 0,
        vRot: 0,
        scale: 1.3, // snaps in from 1.3 to 1.0
        life: 1.0,
        decay: 0.035,
        color,
        glowColor: glow,
        extra: {
          targetW: Math.min(220, Math.max(36, rect.width)),
          targetH: Math.min(80, Math.max(28, rect.height)),
          targetX: rect.left,
          targetY: rect.top,
          tagText: 'LOCK',
        },
      });
    } else {
      // For Katana / Sword / Wand: sharp glint spark at cursor tip
      this.particles.push({
        id: ++this.particleSeq,
        kind: 'crit-star',
        x: this.mouseX,
        y: this.mouseY,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1.2,
        gravity: 0.1,
        drag: 0.94,
        rotation: Math.random() * Math.PI,
        vRot: 0.1,
        scale: 1.1,
        life: 1.0,
        decay: 0.045,
        color,
        glowColor: glow,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Render Loop
  // -------------------------------------------------------------------------
  private loop(): void {
    if (!this.isActive() || !this.ctx || !this.canvas) {
      this.animId = null;
      return;
    }

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Physics integration
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.rotation += p.vRot;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.renderParticle(ctx, p);
    }

    // Keep loop running while particles exist, otherwise pause to save CPU
    if (this.particles.length > 0) {
      this.animId = requestAnimationFrame(this.loop.bind(this));
    } else {
      this.animId = null;
    }
  }

  private renderParticle(ctx: CanvasRenderingContext2D, p: BaseParticle): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life));

    switch (p.kind) {
      case 'grass-block': {
        const sprite = getGrassBlockSprite();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(p.scale, p.scale);
        ctx.drawImage(sprite, -9, -9);
        break;
      }

      case 'oak-log': {
        const sprite = getOakLogSprite();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(p.scale, p.scale);
        ctx.drawImage(sprite, -9, -9);
        break;
      }

      case 'crit-star': {
        const sprite = getCritStarSprite(p.color, p.glowColor || p.color);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(p.scale, p.scale);
        ctx.drawImage(sprite, -5, -5);
        break;
      }

      case 'voxel-cube': {
        const sprite = getVoxelCubeSprite(p.color);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(p.scale, p.scale);
        ctx.drawImage(sprite, -7, -7);
        break;
      }

      case 'dota-coin': {
        const sprite = getDotaCoinSprite();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(p.scale, p.scale);
        ctx.drawImage(sprite, -5, -5);
        break;
      }

      case 'stardust': {
        // Sparkling 4-point twinkle star
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const s = 6 * p.scale;
        ctx.fillStyle = p.glowColor || p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.quadraticCurveTo(0, 0, s, 0);
        ctx.quadraticCurveTo(0, 0, 0, s);
        ctx.quadraticCurveTo(0, 0, -s, 0);
        ctx.quadraticCurveTo(0, 0, 0, -s);
        ctx.closePath();
        ctx.fill();

        // White core glint
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -1, 2, 2);
        break;
      }

      case 'slash-arc': {
        // Katana Crescent Slash Arc
        const r = (p.extra?.slashRadius || 60) * (1 + (1 - p.life) * 0.3);
        const arc = p.extra?.arcLength || Math.PI * 0.7;
        const ang = p.extra?.angle || 0;

        ctx.translate(p.x, p.y);
        ctx.rotate(ang);

        ctx.shadowColor = p.glowColor || p.color;
        ctx.shadowBlur = 12;

        // Outer glow blade stroke
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3.5 * p.life;
        ctx.beginPath();
        ctx.arc(0, 0, r, -arc / 2, arc / 2);
        ctx.stroke();

        // Inner razor sharp steel core (pure white)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8 * p.life;
        ctx.beginPath();
        ctx.arc(0, 0, r, -arc / 2.3, arc / 2.3);
        ctx.stroke();
        break;
      }

      case 'cyber-lock': {
        // Tactical Holographic HUD Target Box [   ]
        const w = (p.extra?.targetW || 60) * (1 + (1 - p.life) * 0.1);
        const h = (p.extra?.targetH || 36) * (1 + (1 - p.life) * 0.1);
        const cx = p.x;
        const cy = p.y;
        const corner = 6;

        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.glowColor || p.color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.5;

        // Top-left bracket
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, cy - h / 2 + corner);
        ctx.lineTo(cx - w / 2, cy - h / 2);
        ctx.lineTo(cx - w / 2 + corner, cy - h / 2);
        ctx.stroke();

        // Top-right bracket
        ctx.beginPath();
        ctx.moveTo(cx + w / 2 - corner, cy - h / 2);
        ctx.lineTo(cx + w / 2, cy - h / 2);
        ctx.lineTo(cx + w / 2, cy - h / 2 + corner);
        ctx.stroke();

        // Bottom-left bracket
        ctx.beginPath();
        ctx.moveTo(cx - w / 2, cy + h / 2 - corner);
        ctx.lineTo(cx - w / 2, cy + h / 2);
        ctx.lineTo(cx - w / 2 + corner, cy + h / 2);
        ctx.stroke();

        // Bottom-right bracket
        ctx.beginPath();
        ctx.moveTo(cx + w / 2 - corner, cy + h / 2);
        ctx.lineTo(cx + w / 2, cy + h / 2);
        ctx.lineTo(cx + w / 2, cy + h / 2 - corner);
        ctx.stroke();

        // Centered HUD ping crosshair
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy);
        ctx.lineTo(cx + 4, cy);
        ctx.moveTo(cx, cy - 4);
        ctx.lineTo(cx, cy + 4);
        ctx.stroke();

        // Tag label
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = p.color;
        ctx.fillText(p.extra?.tagText || 'LOCK', cx - w / 2 + 2, cy - h / 2 - 4);
        break;
      }

      case 'cyber-emp': {
        // Digital EMP expanding pulse ring
        const maxR = 40;
        const currentR = maxR * (1 - p.life * 0.5);
        ctx.translate(p.x, p.y);
        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.glowColor || p.color;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2 * p.life;
        ctx.beginPath();
        ctx.arc(0, 0, currentR, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }
}

export const cursorVfxEngine = new CursorVfxEngine();
