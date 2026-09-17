import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HeadTracker } from '../webrtc/headTracker';

describe('HeadTracker', () => {
  let tracker: HeadTracker;

  beforeEach(() => {
    tracker = new HeadTracker(0.5);
  });

  it('computes unit orientation vectors for neutral forward gaze (0, 0, 0)', () => {
    const vectors = tracker.computeOrientationVectors(0, 0, 0);

    // Forward should point into screen: (0, 0, -1)
    expect(vectors.forward[0]).toBeCloseTo(0, 4);
    expect(vectors.forward[1]).toBeCloseTo(0, 4);
    expect(vectors.forward[2]).toBeCloseTo(-1, 4);

    // Up should point up: (0, 1, 0)
    expect(vectors.up[0]).toBeCloseTo(0, 4);
    expect(vectors.up[1]).toBeCloseTo(1, 4);
    expect(vectors.up[2]).toBeCloseTo(0, 4);
  });

  it('rotates forward vector when turning head right (yaw = +45 deg)', () => {
    const vectors = tracker.computeOrientationVectors(45, 0, 0);

    // Yaw +45 means x > 0 and z < 0
    expect(vectors.forward[0]).toBeGreaterThan(0.5);
    expect(vectors.forward[1]).toBeCloseTo(0, 4);
    expect(vectors.forward[2]).toBeLessThan(-0.5);

    // Magnitude should remain 1.0 (unit vector)
    const mag = Math.hypot(...vectors.forward);
    expect(mag).toBeCloseTo(1.0, 4);
  });

  it('rotates forward vector when nodding up (pitch = +30 deg)', () => {
    const vectors = tracker.computeOrientationVectors(0, 30, 0);

    // Pitch +30 means y > 0
    expect(vectors.forward[0]).toBeCloseTo(0, 4);
    expect(vectors.forward[1]).toBeGreaterThan(0.4);
    expect(vectors.forward[2]).toBeLessThan(-0.7);

    const mag = Math.hypot(...vectors.forward);
    expect(mag).toBeCloseTo(1.0, 4);
  });

  it('applies low-pass smoothing and triggers callback', () => {
    const callback = vi.fn();
    tracker.onOrientationUpdate(callback);

    tracker.applyAngles(20, 10, 5);

    expect(callback).toHaveBeenCalled();
    const [angles, vectors] = callback.mock.calls[0];

    // Due to smoothing 0.5, angles should be halfway toward target
    expect(angles.yaw).toBeGreaterThan(0);
    expect(angles.pitch).toBeGreaterThan(0);
    expect(vectors.forward).toBeDefined();
    expect(vectors.up).toBeDefined();
  });

  it('calculates head pose from 3D face mesh landmarks', () => {
    const callback = vi.fn();
    tracker.onOrientationUpdate(callback);

    // Simulated landmarks: nose shifted right relative to eye center
    const mockLandmarks = [
      { x: 0.5, y: 0.5, z: 0 }, // fallback
      { x: 0.55, y: 0.52, z: 0.1 }, // 1: nose shifted right
      { x: 0.5, y: 0.8, z: 0 }, // 152: chin
      { x: 0.5, y: 0.2, z: 0 }, // 10: forehead
      { x: 0.4, y: 0.35, z: 0 }, // 33: left eye
      { x: 0.6, y: 0.35, z: 0 }, // 263: right eye
    ];

    tracker.processLandmarks(mockLandmarks);

    const angles = tracker.getAngles();
    // Shifting nose to x=0.55 while eye center is 0.5 indicates a positive yaw
    expect(angles.yaw).toBeGreaterThan(0);
  });

  it('handles start and stop lifecycle gracefully', () => {
    expect(tracker.getIsTracking()).toBe(false);

    const mockTrack = { kind: 'video', stop: vi.fn() } as unknown as MediaStreamTrack;
    const mockStream = { getVideoTracks: () => [mockTrack] } as unknown as MediaStream;

    const started = tracker.start(mockStream);
    expect(typeof started).toBe('boolean');

    tracker.stop();
    expect(tracker.getIsTracking()).toBe(false);
  });
});
