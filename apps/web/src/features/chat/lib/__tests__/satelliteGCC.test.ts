import { describe, it, expect } from 'vitest';
import { SatelliteGCC } from '../webrtc/satelliteGCC';

describe('SatelliteGCC (Extreme & Satellite Network Congestion Control)', () => {
  it('maintains normal state and does not collapse bitrate under 650ms high Starlink latency', () => {
    const gcc = new SatelliteGCC('enabled');

    // Simulate clean 650ms Starlink connection (typical LEO propagation)
    for (let i = 0; i < 5; i++) {
      const decision = gcc.processStats(650, 1.0, 15, 1200);
      expect(decision.state).toBe('NORMAL');
      expect(decision.quality).toBe('good');
      expect(decision.recommendedBitrateKbps).toBeGreaterThanOrEqual(1000);
      expect(decision.isSatelliteDetected).toBe(true);
    }
  });

  it('damps transient LEO satellite beam handoff jitter spikes', () => {
    const gcc = new SatelliteGCC('enabled');

    // Warmup window
    gcc.processStats(600, 0, 10, 1200);
    gcc.processStats(610, 0, 12, 1200);

    // Handoff occurs: sudden 180ms jitter spike
    const spike1 = gcc.processStats(680, 1.0, 180, 1200);
    expect(spike1.state, 'Spike 1 must be damped as transient beam handoff').toBe('NORMAL');

    // Second interval of handoff
    const spike2 = gcc.processStats(670, 1.0, 160, 1200);
    expect(spike2.state, 'Spike 2 must be damped').toBe('NORMAL');

    // Returns to stable state
    const stable = gcc.processStats(610, 0, 15, 1200);
    expect(stable.state).toBe('NORMAL');
  });

  it('triggers OVERUSE when true satellite congestion gradient exceeds 250ms', () => {
    const gcc = new SatelliteGCC('enabled');

    // Baseline established at 600ms
    gcc.processStats(600, 0, 10, 1200);
    gcc.processStats(600, 0, 10, 1200);

    // Severe queue buildup: RTT inflates to 950ms (gradient = 350ms > 250ms)
    const congested = gcc.processStats(950, 5.0, 80, 1200);
    expect(congested.state).toBe('OVERUSE');
    expect(congested.quality).toBe('poor');
    expect(congested.recommendedBitrateKbps).toBeLessThan(1200);
  });

  it('auto-detects satellite network when baseline RTT exceeds 400ms', () => {
    const gcc = new SatelliteGCC('auto');

    // Terrestrial link (50ms)
    gcc.processStats(50, 0, 5, 1200);
    expect(gcc.isSatelliteLinkDetected()).toBe(false);

    // Transition to flight Wi-Fi (650ms baseline over 6 intervals)
    for (let i = 0; i < 6; i++) {
      gcc.processStats(650, 1, 20, 1200);
    }
    expect(gcc.isSatelliteLinkDetected()).toBe(true);
  });

  it('generates Opus SDP parameters with in-band FEC and 25% loss resilience for satellite', () => {
    const gcc = new SatelliteGCC('enabled');
    gcc.processStats(650, 0, 10, 1200);

    const sdpParams = gcc.getOpusSdpFormatParams();
    expect(sdpParams).toContain('useinbandfec=1');
    expect(sdpParams).toContain('packetlosspercentage=25');
  });
});
