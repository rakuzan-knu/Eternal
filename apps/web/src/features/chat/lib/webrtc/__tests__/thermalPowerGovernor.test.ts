import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThermalPowerGovernor } from '../thermalPowerGovernor';

describe('ThermalPowerGovernor', () => {
  let governor: ThermalPowerGovernor;

  beforeEach(() => {
    governor = new ThermalPowerGovernor();
  });

  afterEach(() => {
    governor.stop();
  });

  it('maintains normal state under healthy battery and 60 FPS', () => {
    governor.setMockBattery(0.85, false);
    governor.setMockFps(60);

    const metrics = governor.getMetrics();
    expect(metrics.state).toBe('normal');
    expect(metrics.measuredFps).toBe(60);
    expect(metrics.batteryLevel).toBe(0.85);
  });

  it('triggers throttled state when battery drops below 15% and discharging', () => {
    governor.setMockBattery(0.12, false);
    governor.setMockFps(60);

    const metrics = governor.getMetrics();
    expect(metrics.state).toBe('throttled');
    expect(metrics.reason).toContain('Низкий заряд');
  });

  it('does NOT throttle if battery is 12% but actively charging', () => {
    governor.setMockBattery(0.12, true); // plugged in
    governor.setMockFps(60);

    const metrics = governor.getMetrics();
    expect(metrics.state).toBe('normal');
  });

  it('triggers throttled state after 3 consecutive low FPS intervals', () => {
    governor.setMockBattery(0.9, false);

    // Interval 1
    governor.setMockFps(25);
    expect(governor.getMetrics().state).toBe('normal');

    // Interval 2
    governor.setMockFps(24);
    expect(governor.getMetrics().state).toBe('normal');

    // Interval 3
    governor.setMockFps(22);
    expect(governor.getMetrics().state).toBe('throttled');
  });
});
