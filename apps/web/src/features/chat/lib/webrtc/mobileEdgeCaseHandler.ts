/**
 * Mobile Safari / iOS Edge Case & Resilience Handler
 *
 * Resolves iOS Safari aggressive power-saving and privacy constraints:
 * 1. Autoplay Policy Bypass: Catches NotAllowedError on media elements & AudioContext.
 * 2. Bluetooth Headset Codec Switch: Responds to devicechange (AirPods 44.1kHz vs 48kHz sample-rate switches).
 * 3. Background Camera Freeze: Handles OS camera suspension on visibilitychange (app minimize).
 */

export interface MobileEdgeCaseCallbacks {
  onAutoplayBlocked?: (isBlocked: boolean) => void;
  onDeviceListChanged?: (devices: MediaDeviceInfo[]) => void;
  onCameraVisibilityChange?: (isBackgrounded: boolean) => void;
  onAudioContextResumed?: () => void;
}

export class MobileEdgeCaseHandler {
  private isAutoplayBlocked = false;
  private isBackgrounded = false;
  private registeredMediaElements = new Set<HTMLMediaElement>();
  private registeredAudioContexts = new Set<AudioContext>();

  private deviceChangeHandler: (() => void) | null = null;
  private visibilityChangeHandler: (() => void) | null = null;

  constructor(private readonly callbacks: MobileEdgeCaseCallbacks = {}) {}

  /**
   * Initialize browser environment listeners
   */
  public init(): void {
    if (typeof window === 'undefined') return;

    // 1. Bluetooth / Device Change Listener
    if (navigator.mediaDevices && typeof navigator.mediaDevices.addEventListener === 'function') {
      this.deviceChangeHandler = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          this.callbacks.onDeviceListChanged?.(devices);

          // Resume any suspended AudioContexts due to sample rate changes
          for (const ctx of this.registeredAudioContexts) {
            if (ctx.state === 'suspended') {
              void ctx.resume();
            }
          }
        } catch {
          // Ignored
        }
      };
      navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
    }

    // 2. iOS Visibility / App Background Freeze Listener
    if (typeof document !== 'undefined') {
      this.visibilityChangeHandler = () => {
        const isHidden = document.visibilityState === 'hidden';
        if (this.isBackgrounded !== isHidden) {
          this.isBackgrounded = isHidden;
          this.callbacks.onCameraVisibilityChange?.(isHidden);
        }
      };
      document.addEventListener('visibilitychange', this.visibilityChangeHandler);
    }
  }

  /**
   * Register an audio or video element for safe autoplay monitoring
   */
  public registerMediaElement(element: HTMLMediaElement): void {
    this.registeredMediaElements.add(element);

    // Attempt to play and catch Safari NotAllowedError
    const playPromise = element.play();
    if (playPromise !== undefined) {
      playPromise.catch((err: Error) => {
        if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
          this.setAutoplayBlocked(true);
        }
      });
    }
  }

  public unregisterMediaElement(element: HTMLMediaElement): void {
    this.registeredMediaElements.delete(element);
  }

  /**
   * Register an AudioContext for lifecycle management
   */
  public registerAudioContext(context: AudioContext): void {
    this.registeredAudioContexts.add(context);
    if (context.state === 'suspended') {
      this.setAutoplayBlocked(true);
    }
  }

  public unregisterAudioContext(context: AudioContext): void {
    this.registeredAudioContexts.delete(context);
  }

  public getIsAutoplayBlocked(): boolean {
    return this.isAutoplayBlocked;
  }

  public getIsBackgrounded(): boolean {
    return this.isBackgrounded;
  }

  /**
   * Unblock all registered media elements and AudioContexts on user gesture
   */
  public async unblockAutoplay(): Promise<boolean> {
    this.setAutoplayBlocked(false);

    let success = true;

    // Resume AudioContexts
    for (const ctx of this.registeredAudioContexts) {
      try {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
      } catch {
        success = false;
      }
    }

    // Play MediaElements
    for (const el of this.registeredMediaElements) {
      try {
        await el.play();
      } catch {
        success = false;
      }
    }

    if (success) {
      this.callbacks.onAudioContextResumed?.();
    }
    return success;
  }

  /**
   * Safely switch audio output device (e.g. AirPods) using setSinkId if available
   */
  public async setAudioOutputDevice(element: HTMLMediaElement, deviceId: string): Promise<boolean> {
    if (
      typeof (element as unknown as { setSinkId?: (id: string) => Promise<void> }).setSinkId ===
      'function'
    ) {
      try {
        await (element as unknown as { setSinkId: (id: string) => Promise<void> }).setSinkId(
          deviceId,
        );
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  public destroy(): void {
    if (this.deviceChangeHandler && navigator.mediaDevices) {
      navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
      this.deviceChangeHandler = null;
    }
    if (this.visibilityChangeHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    this.registeredMediaElements.clear();
    this.registeredAudioContexts.clear();
  }

  private setAutoplayBlocked(blocked: boolean): void {
    if (this.isAutoplayBlocked !== blocked) {
      this.isAutoplayBlocked = blocked;
      this.callbacks.onAutoplayBlocked?.(blocked);
    }
  }
}
