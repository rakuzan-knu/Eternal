import { describe, expect, it } from 'vitest';
import { createRacingTrack, racingAtlasPose } from '../racingProfileFrameTrack';

describe('Adaptive perimeter racer', () => {
  it.each([
    [180, 270, 18, 0],
    [840, 850, 40, 0],
    [320, 510, 26, 12],
  ])('keeps every pose on a rounded card boundary (%s × %s)', (w, h, r, inset) => {
    const track = createRacingTrack(w, h, r, inset);
    for (let i = 0; i < 2000; i++) {
      const p = track.sample(i / 2000);
      expect(p.x).toBeGreaterThanOrEqual(inset - 1e-6);
      expect(p.x).toBeLessThanOrEqual(w - inset + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(inset - 1e-6);
      expect(p.y).toBeLessThanOrEqual(h - inset + 1e-6);
      expect(Math.min(p.x - inset, w - inset - p.x, p.y - inset, h - inset - p.y)).toBeLessThan(
        r * 0.3 + 1e-6,
      );
      expect(p.heading).toBeGreaterThanOrEqual(0);
      expect(p.heading).toBeLessThan(2 * Math.PI);
    }
  });
  it('closes seamlessly with continuous tangent and eases speed around corners', () => {
    const track = createRacingTrack(240, 400, 26);
    expect(track.sample(0)).toEqual(track.sample(1));
    let lastSpeed: number | undefined;
    const cornerSpeeds: number[] = [],
      straightSpeeds: number[] = [];
    for (let i = 0; i < 4000; i++) {
      const a = track.sample(i / 4000),
        b = track.sample((i + 1) / 4000);
      const speed = Math.hypot(b.x - a.x, b.y - a.y);
      if (lastSpeed !== undefined) expect(Math.abs(speed - lastSpeed)).toBeLessThan(0.009);
      (a.corner ? cornerSpeeds : straightSpeeds).push(speed);
      lastSpeed = speed;
      const turn = Math.abs(
        Math.atan2(Math.sin(b.heading - a.heading), Math.cos(b.heading - a.heading)),
      );
      expect(turn).toBeLessThan(0.014);
    }
    expect(Math.min(...cornerSpeeds)).toBeLessThan(Math.max(...straightSpeeds) * 0.8);
  });
  it('selects bounded 3D views and preserves a smooth heading across atlas wrap', () => {
    for (let i = 0; i < 4096; i++) {
      const pose = racingAtlasPose((i / 4096) * Math.PI * 2, i * 0.4, 80);
      expect(pose.column).toBeGreaterThanOrEqual(0);
      expect(pose.column).toBeLessThan(16);
      expect(pose.row).toBeGreaterThanOrEqual(0);
      expect(pose.row).toBeLessThan(8);
      expect(Math.abs(pose.residual)).toBeLessThanOrEqual(2.8125 + 1e-6);
    }
  });
});
