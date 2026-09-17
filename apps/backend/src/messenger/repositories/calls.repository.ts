import { Injectable } from '@nestjs/common';
import { CallStatus, CallType, CallEndReason, ParticipantRole } from '@prisma/client';
import type { CallParticipant, CallTelemetry } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import type { ICallsRepository } from '../interfaces/calls-repository.interface';
import type { CallWithDetails } from '../interfaces/types';
import { callInclude } from '../interfaces/types';

@Injectable()
export class CallsRepository implements ICallsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createCall(data: {
    conversationId: string;
    type: CallType;
    initiatorId: string;
    participantIds: string[];
    e2eeEnabled?: boolean;
  }): Promise<CallWithDetails> {
    const allParticipantIds = Array.from(new Set([data.initiatorId, ...data.participantIds]));

    return this.prisma.call.create({
      data: {
        conversationId: data.conversationId,
        type: data.type,
        status: CallStatus.INITIATED,
        initiatorId: data.initiatorId,
        e2eeEnabled: data.e2eeEnabled ?? true,
        participants: {
          create: allParticipantIds.map((userId) => ({
            userId,
            role: userId === data.initiatorId ? ParticipantRole.OWNER : ParticipantRole.MEMBER,
            joinedAt: userId === data.initiatorId ? new Date() : null,
            videoState: data.type === CallType.VIDEO,
          })),
        },
      },
      include: callInclude,
    });
  }

  findCallById(callId: string): Promise<CallWithDetails | null> {
    return this.prisma.call.findUnique({
      where: { id: callId },
      include: callInclude,
    });
  }

  findActiveCallForConversation(conversationId: string): Promise<CallWithDetails | null> {
    return this.prisma.call.findFirst({
      where: {
        conversationId,
        status: { in: [CallStatus.INITIATED, CallStatus.RINGING, CallStatus.CONNECTED] },
      },
      orderBy: { startedAt: 'desc' },
      include: callInclude,
    });
  }

  updateCallStatus(
    callId: string,
    status: CallStatus,
    endedReason?: CallEndReason,
    durationMs?: number,
  ): Promise<CallWithDetails> {
    const isEnding = (
      [CallStatus.ENDED, CallStatus.MISSED, CallStatus.DECLINED, CallStatus.FAILED] as CallStatus[]
    ).includes(status);

    return this.prisma.call.update({
      where: { id: callId },
      data: {
        status,
        ...(endedReason ? { endedReason } : {}),
        ...(durationMs !== undefined ? { durationMs } : {}),
        ...(isEnding ? { endedAt: new Date() } : {}),
      },
      include: callInclude,
    });
  }

  addParticipant(
    callId: string,
    userId: string,
    role: ParticipantRole = ParticipantRole.MEMBER,
  ): Promise<CallParticipant> {
    return this.prisma.callParticipant.upsert({
      where: {
        callId_userId: { callId, userId },
      },
      create: {
        callId,
        userId,
        role,
        joinedAt: new Date(),
      },
      update: {
        leftAt: null,
        joinedAt: new Date(),
      },
    });
  }

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
  ): Promise<CallParticipant> {
    return this.prisma.callParticipant.update({
      where: {
        callId_userId: { callId, userId },
      },
      data: {
        ...(data.joinedAt !== undefined ? { joinedAt: data.joinedAt } : {}),
        ...(data.leftAt !== undefined ? { leftAt: data.leftAt } : {}),
        ...(data.muteState !== undefined ? { muteState: data.muteState } : {}),
        ...(data.videoState !== undefined ? { videoState: data.videoState } : {}),
        ...(data.screenShare !== undefined ? { screenShare: data.screenShare } : {}),
      },
    });
  }

  findParticipant(callId: string, userId: string): Promise<CallParticipant | null> {
    return this.prisma.callParticipant.findUnique({
      where: {
        callId_userId: { callId, userId },
      },
    });
  }

  findCallsForUser(userId: string, limit = 50): Promise<CallWithDetails[]> {
    return this.prisma.call.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: callInclude,
    });
  }

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
  }): Promise<CallTelemetry> {
    return this.prisma.callTelemetry.create({
      data: {
        callId: data.callId,
        userId: data.userId,
        avgRttMs: data.avgRttMs,
        maxRttMs: data.maxRttMs ?? null,
        packetLossRatio: data.packetLossRatio,
        jitterMs: data.jitterMs ?? null,
        audioCodec: data.audioCodec ?? null,
        videoCodec: data.videoCodec ?? null,
        durationMs: data.durationMs,
        endReason: data.endReason ?? null,
      },
    });
  }

  findTelemetriesForUser(userId: string, limit = 50): Promise<CallTelemetry[]> {
    return this.prisma.callTelemetry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
