/**
 * Chaos Engineering & P2P Lab (Network Throttling Emulator)
 *
 * Simulates adversarial network conditions in real time:
 * - 30% packet loss (simulates cell edge or UDP drop)
 * - 300 ms jitter (random latency variation)
 * - 64 kbps bandwidth limitation (choking video/audio encoder bitrates)
 * - 500+ ms RTT delays
 * - Network Flapping (rapid disconnect / reconnect cycles)
 */

export type ChaosPreset = 'clean' | 'slow_3g' | 'tunnel_hell' | 'blackhole' | 'custom';

export interface ChaosConfig {
  preset: ChaosPreset;
  /** Packet loss ratio from 0.0 (0%) to 1.0 (100%) */
  packetLossRatio: number;
  /** Latency delay in milliseconds */
  rttDelayMs: number;
  /** Jitter variation in milliseconds (+/-) */
  jitterMs: number;
  /** Bandwidth limit in kilobits per second (0 = unlimited) */
  bandwidthLimitKbps: number;
  /** Whether programmatic network flapping is active */
  isFlapping: boolean;
  /** Interval between disconnect/reconnect in milliseconds */
  flappingIntervalMs: number;
}

export const CHAOS_PRESETS: Record<
  ChaosPreset,
  Omit<ChaosConfig, 'preset' | 'isFlapping' | 'flappingIntervalMs'>
> = {
  clean: {
    packetLossRatio: 0,
    rttDelayMs: 0,
    jitterMs: 0,
    bandwidthLimitKbps: 0,
  },
  slow_3g: {
    packetLossRatio: 0.05,
    rttDelayMs: 400,
    jitterMs: 80,
    bandwidthLimitKbps: 64,
  },
  tunnel_hell: {
    packetLossRatio: 0.3,
    rttDelayMs: 800,
    jitterMs: 300,
    bandwidthLimitKbps: 32,
  },
  blackhole: {
    packetLossRatio: 1.0,
    rttDelayMs: 2000,
    jitterMs: 0,
    bandwidthLimitKbps: 8,
  },
  custom: {
    packetLossRatio: 0.15,
    rttDelayMs: 250,
    jitterMs: 100,
    bandwidthLimitKbps: 128,
  },
};

export class ChaosEngine {
  private config: ChaosConfig = {
    preset: 'clean',
    packetLossRatio: 0,
    rttDelayMs: 0,
    jitterMs: 0,
    bandwidthLimitKbps: 0,
    isFlapping: false,
    flappingIntervalMs: 5000,
  };

  private flappingTimer: ReturnType<typeof setInterval> | null = null;
  private onFlapStateChange: ((state: 'disconnected' | 'reconnected') => void) | null = null;

  constructor(initialConfig?: Partial<ChaosConfig>) {
    if (initialConfig) {
      this.updateConfig(initialConfig);
    }
  }

  public getConfig(): ChaosConfig {
    return { ...this.config };
  }

  public setPreset(preset: ChaosPreset): void {
    const presetValues = CHAOS_PRESETS[preset];
    if (presetValues) {
      this.config = {
        ...this.config,
        ...presetValues,
        preset,
      };
    }
  }

  public updateConfig(updates: Partial<ChaosConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      preset: updates.preset ?? 'custom',
    };
  }

  /**
   * Determine if a simulated packet should be dropped based on packetLossRatio
   */
  public shouldDropPacket(): boolean {
    if (this.config.packetLossRatio <= 0) return false;
    if (this.config.packetLossRatio >= 1.0) return true;
    return Math.random() < this.config.packetLossRatio;
  }

  /**
   * Calculate effective delay for a packet considering RTT latency and jitter
   */
  public calculatePacketDelay(): number {
    const baseDelay = this.config.rttDelayMs / 2; // one-way trip
    if (baseDelay <= 0 && this.config.jitterMs <= 0) return 0;

    const jitterOffset = (Math.random() * 2 - 1) * this.config.jitterMs;
    return Math.max(0, Math.round(baseDelay + jitterOffset));
  }

  /**
   * Apply bandwidth throttling limits to RTCPeerConnection video & audio senders
   */
  public async applyToPeerConnection(pc: RTCPeerConnection | null): Promise<void> {
    if (!pc || typeof pc.getSenders !== 'function') return;

    const limitBps =
      this.config.bandwidthLimitKbps > 0 ? this.config.bandwidthLimitKbps * 1000 : undefined;

    const senders = pc.getSenders();
    for (const sender of senders) {
      if (!sender.track) continue;
      try {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        for (const encoding of params.encodings) {
          if (limitBps !== undefined) {
            encoding.maxBitrate = limitBps;
          } else {
            delete encoding.maxBitrate;
          }
        }
        await sender.setParameters(params);
      } catch {
        // Ignored if parameters cannot be modified in current state
      }
    }
  }

  /**
   * Intercept a DataChannel to inject loss and latency delays into outgoing packets
   */
  public wrapDataChannel(channel: RTCDataChannel): {
    send: (data: string | ArrayBuffer) => boolean;
  } {
    const originalSend = channel.send.bind(channel);

    return {
      send: (data: string | ArrayBuffer): boolean => {
        if (this.shouldDropPacket()) {
          // Packet dropped silently to simulate UDP loss
          return false;
        }

        const delay = this.calculatePacketDelay();
        if (delay === 0) {
          if (typeof data === 'string') {
            originalSend(data);
          } else {
            originalSend(data);
          }
          return true;
        }

        setTimeout(() => {
          if (channel.readyState === 'open') {
            try {
              if (typeof data === 'string') {
                originalSend(data);
              } else {
                originalSend(data);
              }
            } catch {
              // Channel closed while queued
            }
          }
        }, delay);

        return true;
      },
    };
  }

  /**
   * Start programmatic Network Flapping for stress-testing recovery
   */
  public startFlapping(
    onStateChange: (state: 'disconnected' | 'reconnected') => void,
    intervalMs = 5000,
  ): void {
    this.stopFlapping();
    this.config.isFlapping = true;
    this.config.flappingIntervalMs = intervalMs;
    this.onFlapStateChange = onStateChange;

    let isDown = false;
    this.flappingTimer = setInterval(() => {
      isDown = !isDown;
      this.onFlapStateChange?.(isDown ? 'disconnected' : 'reconnected');
    }, intervalMs);
  }

  /**
   * Stop network flapping
   */
  public stopFlapping(): void {
    this.config.isFlapping = false;
    if (this.flappingTimer) {
      clearInterval(this.flappingTimer);
      this.flappingTimer = null;
    }
    this.onFlapStateChange = null;
  }

  /**
   * Teardown all timers and detached resources
   */
  public destroy(): void {
    this.stopFlapping();
  }
}
