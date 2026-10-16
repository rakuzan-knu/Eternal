import { Injectable, ServiceUnavailableException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CallStatus, CallType, CallEndReason, ParticipantRole } from '@prisma/client';
import type { CallParticipant, CallTelemetry } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import type { ICallsRepository } from '../interfaces/calls-repository.interface';
import type { CallWithDetails } from '../interfaces/types';
import { callInclude } from '../interfaces/types';
import { CassandraTelemetryRepository } from '../../common/cassandra/cassandra-telemetry.repository';
import { TelemetrySyncRepository } from '../../common/cassandra/telemetry-sync.repository';

@Injectable()
export class CallsRepository implements ICallsRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly cassandraTelemetry?: CassandraTelemetryRepository,
    @Optional() private readonly telemetryWriter?: TelemetrySyncRepository,
  ) {}

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

  async saveTelemetry(data: {
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
    const cassandra = this.cassandraTelemetry;
    if (cassandra?.enabled) {
      if (!this.telemetryWriter)
        throw new ServiceUnavailableException('Telemetry synchronization unavailable');
      const record: CallTelemetry = {
        ...data,
        id: randomUUID(),
        createdAt: new Date(),
        maxRttMs: data.maxRttMs ?? null,
        jitterMs: data.jitterMs ?? null,
        audioCodec: data.audioCodec ?? null,
        videoCodec: data.videoCodec ?? null,
        endReason: data.endReason ?? null,
      };
      await this.telemetryWriter.write(record);
      return record;
    }
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

  async findTelemetriesForUser(userId: string, limit = 50): Promise<CallTelemetry[]> {
    if (this.cassandraTelemetry?.enabled) {
      const records = await this.cassandraTelemetry.findForUser(userId, limit);
      // A committed deletion must be invisible even while its asynchronous purge is pending.
      const calls = await this.prisma.call.findMany({
        where: { id: { in: [...new Set(records.map((record) => record.callId))] } },
        select: { id: true },
      });
      const existingCalls = new Set(calls.map((call) => call.id));
      return records.filter((record) => existingCalls.has(record.callId));
    }
    return this.prisma.callTelemetry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
