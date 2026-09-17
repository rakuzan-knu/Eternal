/**
 * Thermal & Power-Aware UI Governor for WebRTC
 *
 * Monitors hardware battery status via navigator.getBattery() and live display
 * FPS via requestAnimationFrame delta profiling. Automatically engages throttling
 * when battery < 15% or FPS drops < 35 FPS due to thermal throttling:
 * disables backdrop blur filters, clamps animations to 30 FPS, and switches
 * video stream rendering to native <video> elements.
 */

import { useState, useEffect } from 'react';

export type ThermalGovernorState = 'normal' | 'throttled';

export interface PowerMetrics {
  batteryLevel: number | null; // 0.0 to 1.0
  isCharging: boolean | null;
  measuredFps: number;
  state: ThermalGovernorState;
  reason?: string;
}

interface BatteryManagerLike {
  charging: boolean;
  level: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

export class ThermalPowerGovernor {
  private state: ThermalGovernorState = 'normal';
  private batteryManager: BatteryManagerLike | null = null;
  private animFrameId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private measuredFps = 60;
  private consecutiveLowFpsCount = 0;
  private isRunning = false;
  private listeners = new Set<(metrics: PowerMetrics) => void>();

  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Initialize Battery API
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        const getBattery = (
          navigator as unknown as { getBattery: () => Promise<BatteryManagerLike> }
        ).getBattery;
        this.batteryManager = await getBattery();
        this.batteryManager?.addEventListener?.('levelchange', this.evaluateState);
        this.batteryManager?.addEventListener?.('chargingchange', this.evaluateState);
      } catch {
        // Battery API disallowed
      }
    }

    // 2. Start FPS monitoring loop
    this.lastFrameTime = performance.now();
    this.fpsLoop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private fpsLoop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    this.frameCount++;

    if (now - this.lastFrameTime >= 1000) {
      const deltaSec = (now - this.lastFrameTime) / 1000;
      this.measuredFps = Math.round(this.frameCount / deltaSec);
      this.frameCount = 0;
      this.lastFrameTime = now;

      this.evaluateState();
    }

    this.animFrameId = requestAnimationFrame(this.fpsLoop);
  };

  /**
   * Evaluates battery and thermal FPS thresholds
   */
  public evaluateState = (): void => {
    let shouldThrottle = false;
    let reason = '';

    // Check battery level (< 15% and discharging)
    if (this.batteryManager) {
      const level = this.batteryManager.level;
      const charging = this.batteryManager.charging;

      if (!charging && level <= 0.15) {
        shouldThrottle = true;
        reason = `Низкий заряд батареи (${Math.round(level * 100)}%)`;
      }
    }

    // Check FPS thermal throttling (< 35 FPS for 3 consecutive seconds)
    if (this.measuredFps < 35 && this.measuredFps > 0) {
      this.consecutiveLowFpsCount++;
      if (this.consecutiveLowFpsCount >= 3) {
        shouldThrottle = true;
        reason = reason || `Просадка FPS (${this.measuredFps} кадр/с)`;
      }
    } else {
      this.consecutiveLowFpsCount = 0;
    }

    const nextState: ThermalGovernorState = shouldThrottle ? 'throttled' : 'normal';

    this.lastReason = shouldThrottle ? reason : undefined;

    if (nextState !== this.state) {
      this.state = nextState;
      this.applyDomOptimizations(nextState === 'throttled');
    }

    this.notifyListeners(reason);
  };

  private lastReason?: string;

  private applyDomOptimizations(throttled: boolean): void {
    if (typeof document === 'undefined') return;

    if (throttled) {
      document.body.classList.add('thermal-throttled');
    } else {
      document.body.classList.remove('thermal-throttled');
    }
  }

  private notifyListeners(reason?: string): void {
    const metrics = this.getMetrics(reason);
    this.listeners.forEach((listener) => listener(metrics));
  }

  public getMetrics(reason?: string): PowerMetrics {
    return {
      batteryLevel: this.batteryManager ? this.batteryManager.level : null,
      isCharging: this.batteryManager ? this.batteryManager.charging : null,
      measuredFps: this.measuredFps,
      state: this.state,
      reason: reason !== undefined ? reason : this.lastReason,
    };
  }

  public subscribe(listener: (metrics: PowerMetrics) => void): () => void {
    this.listeners.add(listener);
    listener(this.getMetrics());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setMockBattery(level: number, charging: boolean): void {
    this.batteryManager = { level, charging };
    this.evaluateState();
  }

  public setMockFps(fps: number): void {
    this.measuredFps = fps;
    this.evaluateState();
  }
}

export const globalThermalGovernor = new ThermalPowerGovernor();

/**
 * React hook exposing live thermal and power metrics
 */
export function useThermalPowerGovernor() {
  const [metrics, setMetrics] = useState<PowerMetrics>(() => globalThermalGovernor.getMetrics());

  useEffect(() => {
    void globalThermalGovernor.start();
    const unsubscribe = globalThermalGovernor.subscribe(setMetrics);
    return () => {
      unsubscribe();
    };
  }, []);

  return metrics;
}
