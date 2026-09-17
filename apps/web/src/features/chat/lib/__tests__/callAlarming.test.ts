import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CallAlarming } from '../webrtc/callAlarming';
import * as Sentry from '@sentry/react';
import { apiClient } from '@/shared/api/httpClient';

vi.mock('@sentry/react', () => ({
  withScope: vi.fn((cb: (scope: any) => void) => {
    const scope = {
      setTag: vi.fn(),
      setContext: vi.fn(),
      setLevel: vi.fn(),
    };
    cb(scope);
  }),
  captureException: vi.fn(),
}));

vi.mock('@/shared/api/httpClient', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

describe('CallAlarming (Sentry & OpenTelemetry WebRTC Diagnostics)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('categorizeError', () => {
    it('categorizes NotAllowedError as PERMISSION_DENIED', () => {
      const err = new Error('Permission denied');
      err.name = 'NotAllowedError';
      expect(CallAlarming.categorizeError(err)).toBe('PERMISSION_DENIED');
    });

    it('categorizes NotFoundError as DEVICE_NOT_FOUND', () => {
      const err = new Error('Requested device not found');
      err.name = 'NotFoundError';
      expect(CallAlarming.categorizeError(err)).toBe('DEVICE_NOT_FOUND');
    });

    it('categorizes NotReadableError as DEVICE_IN_USE', () => {
      const err = new Error('Could not start video source');
      err.name = 'NotReadableError';
      expect(CallAlarming.categorizeError(err)).toBe('DEVICE_IN_USE');
    });

    it('categorizes RTCError and DTLS failures as ICE_HANDSHAKE_FAILURE', () => {
      const err = new Error('DTLS handshake failed');
      err.name = 'RTCError';
      expect(CallAlarming.categorizeError(err)).toBe('ICE_HANDSHAKE_FAILURE');

      const iceErr = new Error('ICE connection failed');
      expect(CallAlarming.categorizeError(iceErr)).toBe('ICE_HANDSHAKE_FAILURE');
    });

    it('categorizes unknown error as UNKNOWN', () => {
      const err = new Error('Something unexpected happened');
      expect(CallAlarming.categorizeError(err)).toBe('UNKNOWN');
    });
  });

  describe('extractPeerConnectionDiagnostics', () => {
    it('extracts candidate type, codecs, loss, and RTT from RTCStatsReport', async () => {
      const mockStats = new Map<string, any>([
        ['transport-1', { type: 'transport', selectedCandidatePairId: 'pair-1' }],
        [
          'pair-1',
          {
            type: 'candidate-pair',
            state: 'succeeded',
            currentRoundTripTime: 0.045, // 45ms
            remoteCandidateId: 'cand-remote-1',
          },
        ],
        ['cand-remote-1', { type: 'remote-candidate', candidateType: 'relay' }],
        ['codec-1', { type: 'codec', mimeType: 'audio/opus' }],
        ['codec-2', { type: 'codec', mimeType: 'video/AV1' }],
        [
          'inbound-1',
          {
            type: 'inbound-rtp',
            packetsReceived: 900,
            packetsLost: 100, // 10% loss
            jitter: 0.012, // 12ms
          },
        ],
      ]);

      const mockPc = {
        getStats: vi.fn().mockResolvedValue(mockStats),
      } as unknown as RTCPeerConnection;

      const diag = await CallAlarming.extractPeerConnectionDiagnostics(mockPc);

      expect(diag.iceCandidateType).toBe('relay');
      expect(diag.audioCodec).toBe('opus');
      expect(diag.videoCodec).toBe('av1');
      expect(diag.rttMs).toBe(45);
      expect(diag.jitterMs).toBe(12);
      expect(diag.packetLossPercent).toBe(10);
    });

    it('returns default diagnostics when pc is null or getStats rejects', async () => {
      const diag = await CallAlarming.extractPeerConnectionDiagnostics(null);
      expect(diag.iceCandidateType).toBe('unknown');
      expect(diag.packetLossPercent).toBe(0);
    });
  });

  describe('captureCallAlarm', () => {
    it('dispatches rich context to Sentry and POST /calls/telemetry', async () => {
      const err = new Error('Microphone permission denied');
      err.name = 'NotAllowedError';

      const context = await CallAlarming.captureCallAlarm({
        callId: 'call-alarm-123',
        userId: 'usr-1',
        remoteUserId: 'usr-2',
        error: err,
      });

      expect(context.callId).toBe('call-alarm-123');
      expect(context.errorCategory).toBe('PERMISSION_DENIED');
      expect(context.errorMessage).toBe('Microphone permission denied');
      expect(context.errorName).toBe('NotAllowedError');

      // Verify Sentry was called
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(err);

      // Verify Telemetry API was notified
      expect(apiClient.post).toHaveBeenCalledWith(
        '/calls/telemetry',
        expect.objectContaining({
          callId: 'call-alarm-123',
          endReason: 'PERMISSION_DENIED',
        }),
      );
    });
  });
});
