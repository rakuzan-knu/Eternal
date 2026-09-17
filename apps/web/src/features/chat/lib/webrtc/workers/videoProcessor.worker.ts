/**
 * Video Processor & Reaction Particle Web Worker (OffscreenCanvas)
 *
 * Executes particle physics and rendering off the main browser thread.
 * Leaves main thread 100% free for React UI and user interaction.
 */

export interface ParticleState {
  id: number;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  alpha: number;
  life: number;
  maxLife: number;
  swayFreq: number;
  swayAmp: number;
  seed: number;
}

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let width = 800;
let height = 600;
let dpr = 1;
let isTravelerMode = false;
let isRunning = false;
let animTimer: ReturnType<typeof setTimeout> | null = null;
let particles: ParticleState[] = [];
let nextId = 1;
let lastTime = performance.now();

function updateParticles(dtSeconds: number): boolean {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dtSeconds;

    if (p.life >= p.maxLife) {
      particles.splice(i, 1);
      continue;
    }

    const progress = p.life / p.maxLife;

    // Upward buoyancy with natural deceleration
    p.y += p.vy * dtSeconds;
    p.vy += 15 * dtSeconds;

    // Sinusoidal sway
    p.x += Math.sin(p.life * p.swayFreq + p.seed) * p.swayAmp * dtSeconds;

    // Scale pop-in then gradual float
    if (progress < 0.15) {
      p.scale = (progress / 0.15) * 1.35;
    } else if (progress < 0.3) {
      p.scale = 1.35 - ((progress - 0.15) / 0.15) * 0.35;
    } else {
      p.scale = 1.0;
    }

    // Alpha fade out in last 35%
    if (progress > 0.65) {
      p.alpha = Math.max(0, 1 - (progress - 0.65) / 0.35);
    }
  }

  return particles.length > 0;
}

function renderFrame() {
  if (!ctx || !canvas) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(dpr, dpr);

  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale, p.scale);
    ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.emoji, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

function tick() {
  if (!isRunning) return;

  const now = performance.now();
  const dtSeconds = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  const hasActive = updateParticles(dtSeconds);
  if (hasActive) {
    renderFrame();
    const interval = isTravelerMode ? 66 : 16;
    animTimer = setTimeout(tick, interval);
  } else {
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    animTimer = null;
  }
}

self.onmessage = (event: MessageEvent) => {
  const trustedOrigin = self.location?.origin ?? 'null';
  if (event.origin && event.origin !== trustedOrigin) return;
  const msg = event.data;
  if (!msg || typeof msg !== 'object') return;

  switch (msg.type) {
    case 'INIT_CANVAS': {
      canvas = msg.canvas as OffscreenCanvas;
      width = msg.width || 800;
      height = msg.height || 600;
      dpr = msg.dpr || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null;

      isRunning = true;
      lastTime = performance.now();
      if (particles.length > 0 && !animTimer) {
        tick();
      }
      break;
    }

    case 'RESIZE': {
      width = msg.width || width;
      height = msg.height || height;
      dpr = msg.dpr || dpr;
      if (canvas) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }
      break;
    }

    case 'SPAWN_PARTICLE': {
      const emoji = msg.emoji as string;
      const spawnX =
        typeof msg.startX === 'number' ? msg.startX : width * 0.2 + Math.random() * (width * 0.6);
      const spawnY = height * 0.85 + (Math.random() * 20 - 10);

      particles.push({
        id: nextId++,
        emoji,
        x: spawnX,
        y: spawnY,
        vx: (Math.random() - 0.5) * 40,
        vy: -(120 + Math.random() * 90),
        scale: 0.1,
        alpha: 1.0,
        life: 0,
        maxLife: 2.2 + Math.random() * 0.8,
        swayFreq: 2.0 + Math.random() * 2.0,
        swayAmp: 25 + Math.random() * 25,
        seed: Math.random() * Math.PI * 2,
      });

      // Keep maximum 50 particles
      if (particles.length > 50) {
        particles.shift();
      }

      // Wake up loop if was idle
      if (!animTimer && isRunning) {
        lastTime = performance.now();
        tick();
      }
      break;
    }

    case 'SET_TRAVELER_MODE': {
      isTravelerMode = Boolean(msg.enabled);
      break;
    }

    case 'STOP': {
      isRunning = false;
      if (animTimer) {
        clearTimeout(animTimer);
        animTimer = null;
      }
      particles = [];
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      break;
    }
  }
};
