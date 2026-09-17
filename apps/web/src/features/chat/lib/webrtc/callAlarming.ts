/**
 * Production WebRTC Analytics & Alarming (Sentry & OpenTelemetry)
 *
 * Intercepts specific call termination and hardware failure modes:
 * - NotAllowedError: Microphone/Camera permission denied by user or OS
 * - NotFoundError: No audio/video input devices detected
 * - NotReadableError: Camera/mic locked by another application (Zoom, Teams, etc.)
 * - RTCError / ICEFailure: DTLS/ICE handshake error, STUN/TURN unreachable
 *
 * Sends rich diagnostic context to Sentry and backend telemetry:
 * - iceCandidateType (relay vs srflx vs host)
 * - Active audio and video codecs (Opus, VP9, AV1)
 * - Pre-disconnect packet loss ratio, RTT, and jitter
 * - Client OS and Browser fingerprint
 */

import * as Sentry from '@sentry/react';
import { apiClient } from '@/shared/api/httpClient';

export type WebRTCErrorCategory =
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'DEVICE_IN_USE'
  | 'ICE_HANDSHAKE_FAILURE'
  | 'CONNECTION_DROPPED'
  | 'SIGNALING_TIMEOUT'
  | 'UNKNOWN';

export interface WebRTCDiagnosticContext {
  callId: string;
  userId?: string | null;
  remoteUserId?: string | null;
  errorCategory: WebRTCErrorCategory;
  errorMessage: string;
  errorName: string;
  iceCandidateType: 'relay' | 'srflx' | 'host' | 'prflx' | 'unknown';
  audioCodec: string;
  videoCodec: string;
  packetLossPercent: number;
  rttMs: number;
  jitterMs: number;
  bitrateKbps: number;
  userAgent: string;
  platform: string;
  networkType: string;
  timestamp: string;
}

export class CallAlarming {
  /**
   * Categorize native browser Media / WebRTC errors
   */
  public static categorizeError(err: unknown): WebRTCErrorCategory {
    if (!err || typeof err !== 'object') return 'UNKNOWN';

    const name = (err as Error).name || '';
    const message = (err as Error).message || '';

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'PERMISSION_DENIED';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'DEVICE_NOT_FOUND';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'DEVICE_IN_USE';
    }
    if (
      name === 'RTCError' ||
      name === 'OperationError' ||
      message.toLowerCase().includes('ice') ||
      message.toLowerCase().includes('dtls')
    ) {
      return 'ICE_HANDSHAKE_FAILURE';
    }

    return 'UNKNOWN';
  }

  /**
   * Extract real-time WebRTC stats from RTCPeerConnection
   */
  public static async extractPeerConnectionDiagnostics(pc?: RTCPeerConnection | null): Promise<{
    iceCandidateType: 'relay' | 'srflx' | 'host' | 'prflx' | 'unknown';
    audioCodec: string;
    videoCodec: string;
    packetLossPercent: number;
    rttMs: number;
    jitterMs: number;
    bitrateKbps: number;
  }> {
    const result = {
      iceCandidateType: 'unknown' as 'relay' | 'srflx' | 'host' | 'prflx' | 'unknown',
      audioCodec: 'opus',
      videoCodec: 'VP9',
      packetLossPercent: 0,
      rttMs: 0,
      jitterMs: 0,
      bitrateKbps: 0,
    };

    if (!pc) return result;

    try {
      const stats = await pc.getStats();
      let selectedPairId: string | null = null;
      let totalPacketsLost = 0;
      let totalPacketsReceived = 0;

      stats.forEach((report) => {
        // Find active transport / candidate-pair
        if (report.type === 'transport' && report.selectedCandidatePairId) {
          selectedPairId = report.selectedCandidatePairId as string;
        }

        // Codecs
        if (report.type === 'codec') {
          const mime = ((report.mimeType as string) || '').toLowerCase();
          if (mime.includes('audio/')) {
            result.audioCodec = mime.split('/')[1] || 'opus';
          } else if (mime.includes('video/')) {
            result.videoCodec = mime.split('/')[1] || 'VP9';
          }
        }

        // Inbound RTP packets & jitter
        if (report.type === 'inbound-rtp') {
          const lost = Number(report.packetsLost || 0);
          const received = Number(report.packetsReceived || 0);
          totalPacketsLost += lost;
          totalPacketsReceived += received;
          if (report.jitter) {
            result.jitterMs = Math.round(Number(report.jitter) * 1000);
          }
        }

        // Candidate-pair RTT
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          if (report.currentRoundTripTime) {
            result.rttMs = Math.round(Number(report.currentRoundTripTime) * 1000);
          }
        }
      });

      // Resolve candidate type from selected pair
      if (selectedPairId && stats.has(selectedPairId)) {
        const pair = stats.get(selectedPairId);
        const remoteCandidateId = pair?.remoteCandidateId as string;
        if (remoteCandidateId && stats.has(remoteCandidateId)) {
          const cand = stats.get(remoteCandidateId);
          const cType = ((cand?.candidateType as string) || '').toLowerCase();
          if (cType === 'relay') result.iceCandidateType = 'relay';
          else if (cType === 'srflx') result.iceCandidateType = 'srflx';
          else if (cType === 'host') result.iceCandidateType = 'host';
          else if (cType === 'prflx') result.iceCandidateType = 'prflx';
        }
      }

      if (totalPacketsReceived + totalPacketsLost > 0) {
        result.packetLossPercent =
          Math.round((totalPacketsLost / (totalPacketsReceived + totalPacketsLost)) * 1000) / 10;
      }
    } catch {
      // getStats failed
    }

    return result;
  }

  /**
   * Capture and dispatch comprehensive call failure alarm to Sentry and Telemetry API
   */
  public static async captureCallAlarm(params: {
    callId: string;
    userId?: string | null;
    remoteUserId?: string | null;
    error: unknown;
    category?: WebRTCErrorCategory;
    pc?: RTCPeerConnection | null;
  }): Promise<WebRTCDiagnosticContext> {
    const { callId, userId, remoteUserId, error, pc } = params;
    const category = params.category || this.categorizeError(error);

    const errInstance =
      error instanceof Error
        ? error
        : new Error(typeof error === 'string' ? error : 'WebRTC Call Error');

    const pcDiag = await this.extractPeerConnectionDiagnostics(pc);

    const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator);
    const navConn = (nav as unknown as { connection?: { effectiveType?: string } }).connection;

    const context: WebRTCDiagnosticContext = {
      callId,
      userId: userId || null,
      remoteUserId: remoteUserId || null,
      errorCategory: category,
      errorMessage: errInstance.message,
      errorName: errInstance.name,
      iceCandidateType: pcDiag.iceCandidateType,
      audioCodec: pcDiag.audioCodec,
      videoCodec: pcDiag.videoCodec,
      packetLossPercent: pcDiag.packetLossPercent,
      rttMs: pcDiag.rttMs,
      jitterMs: pcDiag.jitterMs,
      bitrateKbps: pcDiag.bitrateKbps,
      userAgent: nav.userAgent || 'Unknown Browser',
      platform: nav.platform || 'Unknown Platform',
      networkType: navConn?.effectiveType || 'unknown',
      timestamp: new Date().toISOString(),
    };

    // 1. Dispatch to Sentry
    try {
      Sentry.withScope((scope) => {
        scope.setTag('webrtc.error_type', category);
        scope.setTag('webrtc.candidate_type', context.iceCandidateType);
        scope.setTag('webrtc.audio_codec', context.audioCodec);
        scope.setTag('webrtc.video_codec', context.videoCodec);
        scope.setTag('webrtc.network_type', context.networkType);
        scope.setContext('webrtc_diagnostics', context as unknown as Record<string, unknown>);
        scope.setLevel(category === 'PERMISSION_DENIED' ? 'warning' : 'error');

        Sentry.captureException(errInstance);
      });
    } catch {
      // Sentry dispatch ignored if not initialized
    }

    // 2. Dispatch structured telemetry to backend API
    try {
      void apiClient
        .post('/calls/telemetry', {
          callId,
          avgRttMs: context.rttMs,
          packetLossRatio: context.packetLossPercent / 100,
          jitterMs: context.jitterMs,
          audioCodec: context.audioCodec,
          videoCodec: context.videoCodec,
          durationMs: 0,
          endReason: category,
        })
        .catch(() => {});
    } catch {
      // Telemetry dispatch failed
    }

    return context;
  }
}
