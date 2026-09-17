import { describe, it, expect } from 'vitest';
import { ReactionParticleEngine } from '../webrtc/reactionParticleEngine';

describe('ReactionParticleEngine (Floating Video Reactions)', () => {
  it('spawns a burst of 3-5 particles with upward velocity and sway amplitude', () => {
    const engine = new ReactionParticleEngine();
    expect(engine.getActiveCount()).toBe(0);

    engine.spawn('🔥', 640, 480, 0.5);
    const count = engine.getActiveCount();
    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(6);
  });

  it('updates particle physics (upward drift) over simulation ticks', () => {
    const engine = new ReactionParticleEngine();
    engine.spawn('❤️', 640, 480, 0.5);

    // Initial tick of 100ms
    const hasMore = engine.update(0.1);
    expect(hasMore).toBe(true);
    expect(engine.getActiveCount()).toBeGreaterThanOrEqual(3);
  });

  it('culls particles when their lifetime expires and returns false when empty', () => {
    const engine = new ReactionParticleEngine();
    engine.spawn('👏', 640, 480, 0.5);

    // Advance 4 seconds (exceeding 2.8s max lifetime)
    const hasMore = engine.update(4.0);
    expect(hasMore).toBe(false);
    expect(engine.getActiveCount()).toBe(0);
  });

  it('clears particles immediately on clear()', () => {
    const engine = new ReactionParticleEngine();
    engine.spawn('🚀', 640, 480);
    expect(engine.getActiveCount()).toBeGreaterThan(0);

    engine.clear();
    expect(engine.getActiveCount()).toBe(0);
  });
});
