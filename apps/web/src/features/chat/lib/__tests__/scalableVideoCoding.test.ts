import { describe, it, expect, vi } from 'vitest';
import {
  configureSenderSVC,
  setSVCLayerActive,
  switchSVCScalabilityMode,
  scaleSVCForBandwidth,
} from '../webrtc/scalableVideoCoding';

describe('Scalable Video Coding (SVC) & Transceiver Parameters', () => {
  function createMockSender(initialEncodings: RTCRtpEncodingParameters[] = [{}]) {
    const encodings = [...initialEncodings];
    const params: RTCRtpSendParameters = {
      encodings,
      transactionId: 'test-trans-id',
      codecs: [],
      headerExtensions: [],
      rtcp: { cname: '', reducedSize: false },
      degradationPreference: 'balanced',
    };

    const getParameters = vi.fn().mockReturnValue(params);
    const setParameters = vi.fn().mockImplementation((newParams) => {
      params.encodings = newParams.encodings;
      return Promise.resolve();
    });

    return {
      sender: {
        getParameters,
        setParameters,
      } as unknown as RTCRtpSender,
      params,
    };
  }

  it('configures L3T3 SVC parameters on video sender', async () => {
    const { sender, params } = createMockSender();

    const success = await configureSenderSVC(sender, {
      scalabilityMode: 'L3T3',
      maxBitrate: 2_500_000,
      maxFramerate: 60,
    });

    expect(success).toBe(true);
    expect(sender.setParameters).toHaveBeenCalledTimes(1);
    expect(params.encodings[0].scalabilityMode).toBe('L3T3');
    expect(params.encodings[0].maxBitrate).toBe(2_500_000);
    expect(params.encodings[0].maxFramerate).toBe(60);
    expect(params.encodings[0].rid).toBe('h');
  });

  it('toggles video layer active status dynamically', async () => {
    const { sender, params } = createMockSender([{ active: true }]);

    const deactivated = await setSVCLayerActive(sender, false);
    expect(deactivated).toBe(true);
    expect(params.encodings[0].active).toBe(false);

    const reactivated = await setSVCLayerActive(sender, true);
    expect(reactivated).toBe(true);
    expect(params.encodings[0].active).toBe(true);
  });

  it('switches scalabilityMode without renegotiation', async () => {
    const { sender, params } = createMockSender([{ scalabilityMode: 'L3T3' as any }]);

    const switched = await switchSVCScalabilityMode(sender, 'L1T3', 600_000);
    expect(switched).toBe(true);
    expect(params.encodings[0].scalabilityMode).toBe('L1T3');
    expect(params.encodings[0].maxBitrate).toBe(600_000);
  });

  it('dynamically scales SVC preset for different network bandwidths', async () => {
    const { sender, params } = createMockSender();

    // High bandwidth (3 Mbps) -> High Res 60fps (L3T3)
    const high = await scaleSVCForBandwidth(sender, 3_000_000);
    expect(high.mode).toBe('L3T3');
    expect(params.encodings[0].scalabilityMode).toBe('L3T3');

    // Moderate bandwidth (1 Mbps) -> Balanced (L2T2)
    const mid = await scaleSVCForBandwidth(sender, 1_000_000);
    expect(mid.mode).toBe('L2T2');
    expect(params.encodings[0].scalabilityMode).toBe('L2T2');

    // Low bandwidth (500 kbps) -> Low Bandwidth (L1T3)
    const low = await scaleSVCForBandwidth(sender, 500_000);
    expect(low.mode).toBe('L1T3');
    expect(params.encodings[0].scalabilityMode).toBe('L1T3');

    // Starlink / Extreme Low (150 kbps) -> Saver (L1T1)
    const saver = await scaleSVCForBandwidth(sender, 150_000);
    expect(saver.mode).toBe('L1T1');
    expect(params.encodings[0].scalabilityMode).toBe('L1T1');
  });
});
