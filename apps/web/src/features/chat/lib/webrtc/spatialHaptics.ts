/**
 * Spatial Haptics Engine for A11Y (Tactile Directional Accessibility)
 *
 * Translates active speaker tile grid coordinates (X, Y) and speech intensity into
 * dual-rumble stereo vibration via Gamepad API (game controllers) or structured
 * vibration sequences via Vibration API (mobile touchscreens).
 * Enables deaf and hard-of-hearing users to physically feel speaker position and loudness.
 */

export interface NormalizedSpeakerPosition {
  x: number; // -1.0 (far left) to +1.0 (far right), 0.0 is center
  y: number; // -1.0 (top) to +1.0 (bottom)
}

export interface SpatialHapticOptions {
  enabled?: boolean;
  intensityMultiplier?: number; // 0.1 to 2.0 (default 1.0)
  minIntensityThreshold?: number; // Minimum speech volume to trigger haptic (default 0.15)
  throttleMs?: number; // Minimum interval between pulses in ms (default 150ms)
}

export interface StereoVibrationMagnitudes {
  leftMotor: number; // 0.0 to 1.0
  rightMotor: number; // 0.0 to 1.0
  durationMs: number;
}

export class SpatialHapticsEngine {
  private isEnabled = true;
  private intensityMultiplier = 1.0;
  private minIntensityThreshold = 0.15;
  private throttleMs = 150;
  private lastHapticTime = 0;

  constructor(options: SpatialHapticOptions = {}) {
    if (options.enabled !== undefined) this.isEnabled = options.enabled;
    if (options.intensityMultiplier !== undefined)
      this.intensityMultiplier = options.intensityMultiplier;
    if (options.minIntensityThreshold !== undefined)
      this.minIntensityThreshold = options.minIntensityThreshold;
    if (options.throttleMs !== undefined) this.throttleMs = options.throttleMs;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setIntensityMultiplier(multiplier: number): void {
    this.intensityMultiplier = Math.max(0.1, Math.min(2.0, multiplier));
  }

  /**
   * Calculates stereo motor vibration levels based on speaker position and intensity
   */
  public calculateStereoMagnitudes(
    position: NormalizedSpeakerPosition,
    intensity: number,
  ): StereoVibrationMagnitudes {
    const clampedIntensity = Math.max(0, Math.min(1.0, intensity));
    const clampedX = Math.max(-1.0, Math.min(1.0, position.x));

    // Spatial panning: Left motor gets higher weight for negative X, Right for positive X
    const leftWeight = Math.max(0.0, Math.min(1.0, 0.5 - 0.5 * clampedX));
    const rightWeight = Math.max(0.0, Math.min(1.0, 0.5 + 0.5 * clampedX));

    const leftMotor = Math.min(1.0, clampedIntensity * leftWeight * this.intensityMultiplier);
    const rightMotor = Math.min(1.0, clampedIntensity * rightWeight * this.intensityMultiplier);

    // Duration adapts from 50ms (subtle whisper) to 180ms (enthusiastic shouting)
    const durationMs = Math.round(50 + clampedIntensity * 130);

    return {
      leftMotor,
      rightMotor,
      durationMs,
    };
  }

  /**
   * Triggers haptic pulse on connected gamepads or mobile devices
   */
  public triggerSpeechHaptic(
    position: NormalizedSpeakerPosition,
    speechIntensity: number,
  ): boolean {
    if (!this.isEnabled || speechIntensity < this.minIntensityThreshold) {
      return false;
    }

    const now = Date.now();
    if (now - this.lastHapticTime < this.throttleMs) {
      return false;
    }
    this.lastHapticTime = now;

    const { leftMotor, rightMotor, durationMs } = this.calculateStereoMagnitudes(
      position,
      speechIntensity,
    );

    let triggered = false;

    // 1. Attempt Gamepad API (Stereo Dual-Rumble)
    if (typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function') {
      try {
        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
          if (!gp) continue;
          const actuator = (
            gp as unknown as {
              vibrationActuator?: { playEffect: (type: string, opts: unknown) => Promise<unknown> };
            }
          ).vibrationActuator;
          if (actuator && typeof actuator.playEffect === 'function') {
            void actuator.playEffect('dual-rumble', {
              startDelay: 0,
              duration: durationMs,
              weakMagnitude: leftMotor,
              strongMagnitude: rightMotor,
            });
            triggered = true;
          }
        }
      } catch {
        // Gamepad rumble unavailable
      }
    }

    // 2. Fallback to Mobile Vibration API
    if (!triggered && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        if (position.x < -0.2) {
          // Left speaker: rhythmic double tap
          navigator.vibrate([30, 40, 20]);
        } else if (position.x > 0.2) {
          // Right speaker: single sustained vibration
          navigator.vibrate([durationMs]);
        } else {
          // Center speaker: balanced pulse
          navigator.vibrate([Math.round(durationMs * 0.7)]);
        }
        triggered = true;
      } catch {
        // Vibration API denied
      }
    }

    return triggered;
  }
}

export const globalSpatialHaptics = new SpatialHapticsEngine();
