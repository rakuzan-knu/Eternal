import type {
  CallParticipant,
  CallTelemetry,
  CallStatus,
  CallType,
  CallEndReason,
  ParticipantRole,
} from '@prisma/client';
import type { CallWithDetails } from './types';

export const CALLS_REPOSITORY = Symbol('CALLS_REPOSITORY');

export interface ICallsRepository {
  createCall(data: {
    conversationId: string;
    type: CallType;
    initiatorId: string;
    participantIds: string[];
    e2eeEnabled?: boolean;
  }): Promise<CallWithDetails>;

  findCallById(callId: string): Promise<CallWithDetails | null>;

  findActiveCallForConversation(conversationId: string): Promise<CallWithDetails | null>;

  updateCallStatus(
    callId: string,
    status: CallStatus,
    endedReason?: CallEndReason,
    durationMs?: number,
  ): Promise<CallWithDetails>;

  addParticipant(callId: string, userId: string, role?: ParticipantRole): Promise<CallParticipant>;

  updateParticipantState(
    callId: string,
    userId: string,
    data: {
      joinedAt?: Date | null;
      leftAt?: Date | null;
      muteState?: boolean;
      videoState?: boolean;
      screenShare?: boolean;
    },
  ): Promise<CallParticipant>;

  findParticipant(callId: string, userId: string): Promise<CallParticipant | null>;

  findCallsForUser(userId: string, limit?: number): Promise<CallWithDetails[]>;

  saveTelemetry(data: {
    callId: string;
    userId: string;
    avgRttMs: number;
    maxRttMs?: number | null;
    packetLossRatio: number;
    jitterMs?: number | null;
    audioCodec?: string | null;
    videoCodec?: string | null;
    durationMs: number;
    endReason?: string | null;
  }): Promise<CallTelemetry>;

  findTelemetriesForUser(userId: string, limit?: number): Promise<CallTelemetry[]>;
}
