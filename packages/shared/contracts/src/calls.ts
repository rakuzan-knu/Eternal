import { z } from 'zod';
import type { UserSnapshot } from './chat';

export const CallType = {
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO',
  SCREEN_SHARE: 'SCREEN_SHARE',
} as const;
export type CallType = (typeof CallType)[keyof typeof CallType];

export const CallStatus = {
  INITIATED: 'INITIATED',
  RINGING: 'RINGING',
  CONNECTED: 'CONNECTED',
  ENDED: 'ENDED',
  MISSED: 'MISSED',
  DECLINED: 'DECLINED',
  FAILED: 'FAILED',
} as const;
export type CallStatus = (typeof CallStatus)[keyof typeof CallStatus];

export const CallEndReason = {
  ENDED_BY_USER: 'ENDED_BY_USER',
  MISSED: 'MISSED',
  DECLINED: 'DECLINED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PARTICIPANT_LEFT: 'PARTICIPANT_LEFT',
  SYSTEM: 'SYSTEM',
} as const;
export type CallEndReason = (typeof CallEndReason)[keyof typeof CallEndReason];

export const zkpCallProofSchema = z.object({
  proofType: z.literal('schnorr_membership'),
  commitment: z.string(),
  challenge: z.string(),
  response: z.string(),
  publicSignals: z.object({
    epoch: z.number(),
    minReputation: z.number(),
    nullifierHash: z.string(),
  }),
  anonymousAlias: z.string().optional(),
});
export type ZkpCallProof = z.infer<typeof zkpCallProofSchema>;

export const initiateCallSchema = z.object({
  conversationId: z.string().min(1).max(128),
  callType: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.toUpperCase() : val),
      z.nativeEnum(CallType),
    )
    .default(CallType.AUDIO),
  sdpOffer: z.unknown().optional(),
  iceCandidates: z.array(z.unknown()).optional(),
  zkpProof: zkpCallProofSchema.optional(),
  isGhostMode: z.boolean().optional(),
  // Ephemeral ECDH public (SPKI b64) for the E2EE handshake. Opaque to the
  // server: validated for shape only, relayed verbatim, never used in crypto.
  e2eeEphemeralKey: z.string().min(1).max(2048).optional(),
  // ECDSA identity signature over the ephemeral key (TOFU verification).
  e2eeBindingSignature: z.string().min(1).max(2048).optional(),
});
export type InitiateCallDto = z.infer<typeof initiateCallSchema>;

export const acceptCallSchema = z.object({
  callId: z.string().min(1).max(128),
  sdpAnswer: z.unknown().optional(),
  iceCandidates: z.array(z.unknown()).optional(),
  e2eeEphemeralKey: z.string().min(1).max(2048).optional(),
  e2eeBindingSignature: z.string().min(1).max(2048).optional(),
});
export type AcceptCallDto = z.infer<typeof acceptCallSchema>;

export const rejectCallSchema = z.object({
  callId: z.string().min(1).max(128),
  reason: z.nativeEnum(CallEndReason).optional().default(CallEndReason.DECLINED),
});
export type RejectCallDto = z.infer<typeof rejectCallSchema>;

export const endCallSchema = z.object({
  callId: z.string().min(1).max(128),
  reason: z.nativeEnum(CallEndReason).optional().default(CallEndReason.ENDED_BY_USER),
  durationMs: z.number().int().min(0).optional(),
});
export type EndCallDto = z.infer<typeof endCallSchema>;

export const iceCandidateSchema = z.object({
  callId: z.string().min(1).max(128),
  candidate: z.unknown(),
  targetUserId: z.string().max(128).optional(),
});
export type IceCandidateDto = z.infer<typeof iceCandidateSchema>;

export const muteToggleSchema = z.object({
  callId: z.string().min(1).max(128),
  isMuted: z.boolean(),
});
export type MuteToggleDto = z.infer<typeof muteToggleSchema>;

export const videoToggleSchema = z.object({
  callId: z.string().min(1).max(128),
  isVideoOff: z.boolean(),
});
export type VideoToggleDto = z.infer<typeof videoToggleSchema>;

export const screenShareSchema = z.object({
  callId: z.string().min(1).max(128),
  isSharing: z.boolean(),
});
export type ScreenShareDto = z.infer<typeof screenShareSchema>;

export const callReconnectSchema = z.object({
  callId: z.string().min(1).max(128),
});
export type CallReconnectDto = z.infer<typeof callReconnectSchema>;

export const iceRestartSchema = z.object({
  callId: z.string().min(1).max(128),
  targetUserId: z.string().min(1).max(128).optional(),
  sdpOffer: z.unknown().optional(),
});
export type IceRestartDto = z.infer<typeof iceRestartSchema>;

export const iceRestartAnswerSchema = z.object({
  callId: z.string().min(1).max(128),
  targetUserId: z.string().min(1).max(128).optional(),
  sdpAnswer: z.unknown(),
});
export type IceRestartAnswerDto = z.infer<typeof iceRestartAnswerSchema>;

export const declineCallSchema = z.object({
  reason: z.string().max(128).optional(),
});
export type DeclineCallDto = z.infer<typeof declineCallSchema>;

export interface CallParticipantView {
  id: string;
  callId: string;
  userId: string;
  user: UserSnapshot;
  joinedAt: Date | string | null;
  leftAt: Date | string | null;
  muteState: boolean;
  videoState: boolean;
  screenShare: boolean;
  role: string;
}

export interface CallSessionView {
  id: string;
  conversationId: string;
  type: CallType;
  status: CallStatus;
  initiatorId: string;
  initiator: UserSnapshot;
  startedAt: Date | string;
  endedAt: Date | string | null;
  durationMs: number | null;
  participants: CallParticipantView[];
}

export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface IceServersResponse {
  iceServers: IceServerConfig[];
}

export interface CallLogMetadata {
  callId: string;
  callType: CallType;
  status: CallStatus;
  endedReason: CallEndReason;
  durationMs: number;
  participantsCount: number;
}

export const callTelemetrySchema = z.object({
  callId: z.string().min(1).max(128),
  avgRttMs: z.number().min(0),
  maxRttMs: z.number().min(0).optional(),
  packetLossRatio: z.number().min(0).max(1),
  jitterMs: z.number().min(0).optional(),
  audioCodec: z.string().max(64).optional(),
  videoCodec: z.string().max(64).optional(),
  durationMs: z.number().int().min(0),
  endReason: z.string().max(64).optional(),
});
export type CallTelemetryDto = z.infer<typeof callTelemetrySchema>;

export interface CallTelemetryView {
  id: string;
  callId: string;
  userId: string;
  avgRttMs: number;
  maxRttMs: number | null;
  packetLossRatio: number;
  jitterMs: number | null;
  audioCodec: string | null;
  videoCodec: string | null;
  durationMs: number;
  endReason: string | null;
  createdAt: Date | string;
}

export interface CallQualitySummaryView {
  totalCalls: number;
  avgRttMs: number;
  avgPacketLossRatio: number;
  avgDurationMs: number;
  recentTelemetries: CallTelemetryView[];
}

export const relayAnnounceSchema = z.object({
  natType: z.enum(['open', 'full-cone', 'restricted-cone', 'symmetric']).default('full-cone'),
  maxSlots: z.number().int().min(1).max(20).default(5),
});
export type RelayAnnounceDto = z.infer<typeof relayAnnounceSchema>;

export const relayRequestSchema = z.object({
  callId: z.string().min(1).max(128),
  targetUserId: z.string().min(1).max(128),
});
export type RelayRequestDto = z.infer<typeof relayRequestSchema>;

export interface RelayAssignedPayload {
  callId: string;
  relaySessionId: string;
  relayUserId: string;
  targetUserId: string;
  isInitiator: boolean;
}

export const webTransportSessionRequestSchema = z.object({
  callId: z.string().min(1).max(128),
  clientCapabilities: z
    .object({
      datagrams: z.boolean().default(true),
      streams: z.boolean().default(true),
    })
    .optional(),
});
export type WebTransportSessionRequestDto = z.infer<typeof webTransportSessionRequestSchema>;

export interface WebTransportSessionResponse {
  endpointUrl: string;
  sessionTicket: string;
  maxDatagramSize: number;
  quicSupported: boolean;
  expiresInSec: number;
}

export const WT_DATAGRAM_TYPES = {
  ICE_CANDIDATE: 1,
  TELEMETRY: 2,
  PING: 3,
  PONG: 4,
  STATE_SYNC: 5,
} as const;
export type WtDatagramType = (typeof WT_DATAGRAM_TYPES)[keyof typeof WT_DATAGRAM_TYPES];

export const callHandoffRequestSchema = z.object({
  callId: z.string().min(1).max(128),
  targetDeviceId: z.string().max(128).optional(),
});
export type CallHandoffRequestDto = z.infer<typeof callHandoffRequestSchema>;

export interface CallHandoffPreparePayload {
  callId: string;
  conversationId: string;
  call: CallSessionView;
}

export interface CallHandoffCompletePayload {
  callId: string;
  newSocketId?: string;
  reason: string;
}
