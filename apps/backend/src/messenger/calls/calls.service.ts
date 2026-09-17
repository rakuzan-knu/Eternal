import type {
  CallLogMetadata,
  CallQualitySummaryView,
  CallSessionView,
  CallTelemetryView,
  IceServerConfig,
  IceServersResponse,
  WebTransportSessionResponse,
} from '@common/contracts';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { CallEndReason, CallStatus, CallType, MessageType, PrivacyDimension } from '@prisma/client';
import * as crypto from 'node:crypto';
import { MetricsService } from '../../metrics/metrics.service';
import { RedisService } from '../../redis/redis.service';
import { VisibilityResolver } from '../../users/privacy/visibility.resolver';
import { ConversationsService } from '../conversations/conversations.service';
import { WS_EVENTS } from '../events/ws-events';
import { MessengerGateway } from '../gateway/messenger.gateway';
import type { ICallsRepository } from '../interfaces/calls-repository.interface';
import { CALLS_REPOSITORY } from '../interfaces/calls-repository.interface';
import type { IMessagesRepository } from '../interfaces/messages-repository.interface';
import { MESSAGES_REPOSITORY } from '../interfaces/messages-repository.interface';
import type { CallWithDetails } from '../interfaces/types';
import type { CreateCallTelemetryDto } from './dto/call-telemetry.dto';
import { MessengerMapper } from '../messenger.mapper';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    @Inject(CALLS_REPOSITORY)
    private readonly callsRepo: ICallsRepository,
    @Inject(MESSAGES_REPOSITORY)
    private readonly messagesRepo: IMessagesRepository,
    private readonly convsService: ConversationsService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => VisibilityResolver))
    private readonly visibility: VisibilityResolver,
    private readonly configService: ConfigService,
    @Optional()
    private readonly metricsService?: MetricsService,
    @Inject(forwardRef(() => MessengerGateway))
    @Optional()
    private readonly gateway?: MessengerGateway,
    @Inject(forwardRef(() => MessengerMapper))
    @Optional()
    private readonly mapper?: MessengerMapper,
  ) {}

  async initiateCall(
    callerId: string,
    conversationId: string,
    callType: CallType = CallType.AUDIO,
    sdpOffer?: unknown,
    iceCandidates?: unknown[],
    zkpProof?: unknown,
    isGhostMode?: boolean,
  ): Promise<{
    call: CallWithDetails;
    targetUserIds: string[];
    sdpOffer?: unknown;
    iceCandidates?: unknown[];
    zkpProof?: unknown;
    isGhostMode?: boolean;
  }> {
    // 1. Membership assertion
    await this.convsService.assertMember(conversationId, callerId);

    // 2. Rate limiting check (per-user call initiation: 10 per minute default)
    const rateLimit = Number(this.configService.get<string>('CALL_RATE_LIMIT_PER_MINUTE') || '10');
    const rateKey = `call:ratelimit:${callerId}`;
    const attempts = await this.redisService.incr(rateKey).catch(() => 1);
    if (attempts === 1) {
      await this.redisService.expire(rateKey, 60).catch(() => {});
    }
    if (attempts > rateLimit) {
      throw new WsException('Call rate limit exceeded. Please try again later.');
    }

    // 3. Conversation participant IDs
    const participantIds = await this.convsService.getParticipantIds(conversationId);
    const targetUserIds = participantIds.filter((id) => id !== callerId);
    if (targetUserIds.length === 0) {
      throw new WsException('Cannot initiate call in an empty conversation.');
    }

    // 4. Block checks
    const { blockedByMe, blockingMe } = await this.convsService.getBlockRelationships(callerId);
    const reachableUserIds = targetUserIds.filter(
      (id) => !blockedByMe.has(id) && !blockingMe.has(id),
    );
    if (reachableUserIds.length === 0) {
      throw new WsException('Cannot reach any participant due to user blocks.');
    }

    // 5. Privacy enforcement (CALLS dimension) for 1:1 calls
    if (reachableUserIds.length === 1) {
      const calleeId = reachableUserIds[0];
      const ctx = await this.visibility.loadContext([calleeId], callerId);
      const canCall = this.visibility.resolve(PrivacyDimension.CALLS, calleeId, ctx);
      if (!canCall) {
        throw new WsException('User privacy settings do not allow calls from you.');
      }
    }

    // 6. Create Call in repository
    const call = await this.callsRepo.createCall({
      conversationId,
      type: callType,
      initiatorId: callerId,
      participantIds: reachableUserIds,
      e2eeEnabled: true,
    });

    return {
      call,
      targetUserIds: reachableUserIds,
      ...(sdpOffer !== undefined ? { sdpOffer } : {}),
      ...(iceCandidates !== undefined ? { iceCandidates } : {}),
      ...(zkpProof !== undefined ? { zkpProof } : {}),
      ...(isGhostMode !== undefined ? { isGhostMode } : {}),
    };
  }

  async acceptCall(
    calleeId: string,
    callId: string,
    sdpAnswer?: unknown,
    iceCandidates?: unknown[],
  ): Promise<{
    call: CallWithDetails;
    initiatorId: string;
    sdpAnswer?: unknown;
    iceCandidates?: unknown[];
  }> {
    const call = await this.callsRepo.findCallById(callId);
    if (!call) throw new NotFoundException('Call not found');

    if (call.status === CallStatus.ENDED || call.status === CallStatus.DECLINED) {
      throw new BadRequestException('Call is no longer active');
    }

    await this.callsRepo.updateParticipantState(callId, calleeId, {
      joinedAt: new Date(),
    });

    const updated = await this.callsRepo.updateCallStatus(callId, CallStatus.CONNECTED);

    return {
      call: updated,
      initiatorId: call.initiatorId,
      ...(sdpAnswer !== undefined ? { sdpAnswer } : {}),
      ...(iceCandidates !== undefined ? { iceCandidates } : {}),
    };
  }

  async rejectCall(
    calleeId: string,
    callId: string,
    reason: CallEndReason = CallEndReason.DECLINED,
  ): Promise<{ call: CallWithDetails; conversationId: string; targetUserIds: string[] }> {
    const call = await this.callsRepo.findCallById(callId);
    if (!call) throw new NotFoundException('Call not found');

    const durationMs = 0;
    const updated = await this.callsRepo.updateCallStatus(
      callId,
      CallStatus.DECLINED,
      reason,
      durationMs,
    );

    await this.createCallLogMessage(call, CallStatus.DECLINED, reason, durationMs);

    const targetUserIds = call.participants.map((p) => p.userId).filter((id) => id !== calleeId);

    return {
      call: updated,
      conversationId: call.conversationId,
      targetUserIds,
    };
  }

  async endCall(
    actorId: string,
    callId: string,
    reason: CallEndReason = CallEndReason.ENDED_BY_USER,
    clientDurationMs?: number,
  ): Promise<{
    call: CallWithDetails;
    conversationId: string;
    targetUserIds: string[];
    durationMs: number;
  }> {
    const call = await this.callsRepo.findCallById(callId);
    if (!call) throw new NotFoundException('Call not found');

    if (
      ([CallStatus.ENDED, CallStatus.DECLINED, CallStatus.MISSED] as CallStatus[]).includes(
        call.status,
      )
    ) {
      return {
        call,
        conversationId: call.conversationId,
        targetUserIds: call.participants.map((p) => p.userId).filter((id) => id !== actorId),
        durationMs: call.durationMs ?? 0,
      };
    }

    const calculatedDuration = Math.max(0, Date.now() - call.startedAt.getTime());
    const durationMs = clientDurationMs !== undefined ? clientDurationMs : calculatedDuration;

    await this.callsRepo.updateParticipantState(callId, actorId, {
      leftAt: new Date(),
    });

    const updated = await this.callsRepo.updateCallStatus(
      callId,
      CallStatus.ENDED,
      reason,
      durationMs,
    );

    await this.createCallLogMessage(call, CallStatus.ENDED, reason, durationMs);

    const targetUserIds = call.participants.map((p) => p.userId).filter((id) => id !== actorId);

    return {
      call: updated,
      conversationId: call.conversationId,
      targetUserIds,
      durationMs,
    };
  }

  async toggleMedia(
    userId: string,
    callId: string,
    type: 'mute' | 'video' | 'screenShare',
    state: boolean,
  ): Promise<CallWithDetails> {
    const call = await this.callsRepo.findCallById(callId);
    if (!call) throw new NotFoundException('Call not found');

    const updateData: { muteState?: boolean; videoState?: boolean; screenShare?: boolean } = {};
    if (type === 'mute') updateData.muteState = state;
    if (type === 'video') updateData.videoState = state;
    if (type === 'screenShare') updateData.screenShare = state;

    await this.callsRepo.updateParticipantState(callId, userId, updateData);
    return (await this.callsRepo.findCallById(callId))!;
  }

  async declineCall(callId: string, userId: string, reason?: string): Promise<void> {
    const endReason = reason ? (reason as CallEndReason) : CallEndReason.DECLINED;
    const result = await this.rejectCall(userId, callId, endReason);

    if (this.gateway) {
      const endedPayload = {
        callId,
        reason: endReason,
        declinedBy: userId,
      };
      for (const targetUserId of result.targetUserIds) {
        this.gateway.emitToUser(targetUserId, WS_EVENTS.CALL_ENDED, endedPayload);
      }
    }
  }

  /**
   * Generates dynamic time-limited ephemeral TURN credentials (Coturn HMAC-SHA1 REST API)
   */
  generateEphemeralTurnCredentials(userId?: string): IceServerConfig | null {
    const turnSecret =
      this.configService.get<string>('COTURN_SHARED_SECRET') ||
      this.configService.get<string>('TURN_SHARED_SECRET') ||
      this.configService.get<string>('TURN_SECRET');
    const turnHost =
      this.configService.get<string>('COTURN_HOST') || this.configService.get<string>('TURN_HOST');

    if (!turnSecret || !turnHost) {
      return null;
    }

    // 15 minutes TTL
    const expiryTimestamp = Math.floor(Date.now() / 1000) + 15 * 60;
    const username = `${expiryTimestamp}:${userId || 'ephemeral_peer'}`;
    const credential = crypto.createHmac('sha256', turnSecret).update(username).digest('base64');

    return {
      urls: [
        `turn:${turnHost}:3478?transport=udp`,
        `turn:${turnHost}:3478?transport=tcp`,
        `turns:${turnHost}:5349?transport=tcp`,
      ],
      username,
      credential,
    };
  }

  async getIceServers(userId?: string): Promise<IceServersResponse> {
    const stunUrlsEnv = this.configService.get<string>('STUN_URLS');
    const stunUrls = stunUrlsEnv
      ? stunUrlsEnv.split(',').map((u) => u.trim())
      : [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302',
          'stun:stun4.l.google.com:19302',
        ];

    const iceServers: IceServerConfig[] = [{ urls: stunUrls }];

    // 1. Check Coturn dynamic ephemeral HMAC credentials
    const ephemeralTurn = this.generateEphemeralTurnCredentials(userId);
    if (ephemeralTurn) {
      iceServers.push(ephemeralTurn);
      return { iceServers };
    }

    // 2. Check custom static configured TURN credentials
    const turnUrl = this.configService.get<string>('TURN_URL');
    const turnUsername = this.configService.get<string>('TURN_USERNAME');
    const turnPassword = this.configService.get<string>('TURN_PASSWORD');

    if (turnUrl && turnUsername && turnPassword) {
      iceServers.push({
        urls: [turnUrl],
        username: turnUsername,
        credential: turnPassword,
      });
      return { iceServers };
    }

    // 2. Check Metered.ca dynamic API credentials
    const meteredDomain = this.configService.get<string>('METERED_DOMAIN');
    const meteredApiKey = this.configService.get<string>('METERED_API_KEY');

    if (meteredDomain && meteredApiKey) {
      const cacheKey = `webrtc:turn:metered:${meteredDomain}`;
      try {
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as IceServerConfig[];
          return { iceServers: [...iceServers, ...parsed] };
        }

        const res = await fetch(
          `https://${meteredDomain}.metered.ca/api/v1/turn/credentials?apiKey=${meteredApiKey}`,
        );
        if (res.ok) {
          const meteredServers = (await res.json()) as IceServerConfig[];
          if (Array.isArray(meteredServers) && meteredServers.length > 0) {
            await this.redisService.set(cacheKey, JSON.stringify(meteredServers), 3600);
            return { iceServers: [...iceServers, ...meteredServers] };
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch Metered.ca TURN credentials: ${String(err)}`);
      }
    }

    // 3. Fallback to OpenRelay free community TURN servers (TCP + UDP ports 80/443 for firewall bypass)
    iceServers.push({
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
        'turns:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    });

    return { iceServers };
  }

  async saveTelemetry(userId: string, dto: CreateCallTelemetryDto): Promise<CallTelemetryView> {
    const call = await this.callsRepo.findCallById(dto.callId);
    if (!call) {
      this.logger.debug(`Telemetry for unknown call ${dto.callId} from user ${userId} — ignoring`);
      return {
        id: '',
        callId: dto.callId,
        userId,
        avgRttMs: dto.avgRttMs,
        maxRttMs: dto.maxRttMs ?? null,
        packetLossRatio: dto.packetLossRatio,
        jitterMs: dto.jitterMs ?? null,
        audioCodec: dto.audioCodec ?? null,
        videoCodec: dto.videoCodec ?? null,
        durationMs: dto.durationMs,
        endReason: dto.endReason ?? null,
        createdAt: new Date(),
      };
    }

    const isMember = call.participants.some((p) => p.userId === userId);
    if (!isMember) throw new ForbiddenException('Not a participant of this call');

    const record = await this.callsRepo.saveTelemetry({
      callId: dto.callId,
      userId,
      avgRttMs: dto.avgRttMs,
      maxRttMs: dto.maxRttMs ?? null,
      packetLossRatio: dto.packetLossRatio,
      jitterMs: dto.jitterMs ?? null,
      audioCodec: dto.audioCodec ?? null,
      videoCodec: dto.videoCodec ?? null,
      durationMs: dto.durationMs,
      endReason: dto.endReason ?? null,
    });

    return {
      id: record.id,
      callId: record.callId,
      userId: record.userId,
      avgRttMs: record.avgRttMs,
      maxRttMs: record.maxRttMs,
      packetLossRatio: record.packetLossRatio,
      jitterMs: record.jitterMs,
      audioCodec: record.audioCodec,
      videoCodec: record.videoCodec,
      durationMs: record.durationMs,
      endReason: record.endReason,
      createdAt: record.createdAt,
    };
  }

  async getUserTelemetrySummary(userId: string): Promise<CallQualitySummaryView> {
    const telemetries = await this.callsRepo.findTelemetriesForUser(userId, 50);
    const totalCalls = telemetries.length;

    if (totalCalls === 0) {
      return {
        totalCalls: 0,
        avgRttMs: 0,
        avgPacketLossRatio: 0,
        avgDurationMs: 0,
        recentTelemetries: [],
      };
    }

    const totalRtt = telemetries.reduce((acc, t) => acc + t.avgRttMs, 0);
    const totalLoss = telemetries.reduce((acc, t) => acc + t.packetLossRatio, 0);
    const totalDuration = telemetries.reduce((acc, t) => acc + t.durationMs, 0);

    return {
      totalCalls,
      avgRttMs: Math.round((totalRtt / totalCalls) * 10) / 10,
      avgPacketLossRatio: Math.round((totalLoss / totalCalls) * 1000) / 1000,
      avgDurationMs: Math.round(totalDuration / totalCalls),
      recentTelemetries: telemetries.slice(0, 10).map((t) => ({
        id: t.id,
        callId: t.callId,
        userId: t.userId,
        avgRttMs: t.avgRttMs,
        maxRttMs: t.maxRttMs,
        packetLossRatio: t.packetLossRatio,
        jitterMs: t.jitterMs,
        audioCodec: t.audioCodec,
        videoCodec: t.videoCodec,
        durationMs: t.durationMs,
        endReason: t.endReason,
        createdAt: t.createdAt,
      })),
    };
  }

  async getCallHistory(userId: string, limit = 50): Promise<CallSessionView[]> {
    const calls = await this.callsRepo.findCallsForUser(userId, limit);
    return calls.map((c) => this.mapToView(c));
  }

  async getCallById(callId: string, userId: string): Promise<CallSessionView> {
    const call = await this.callsRepo.findCallById(callId);
    if (!call) throw new NotFoundException('Call not found');

    const isMember = call.participants.some((p) => p.userId === userId);
    if (!isMember) throw new ForbiddenException('Not a participant of this call');

    return this.mapToView(call);
  }

  private async createCallLogMessage(
    call: CallWithDetails,
    status: CallStatus,
    reason: CallEndReason,
    durationMs: number,
  ): Promise<void> {
    try {
      const metadata: CallLogMetadata = {
        callId: call.id,
        callType: call.type,
        status: status,
        endedReason: reason,
        durationMs,
        participantsCount: call.participants.length,
      };

      const body = JSON.stringify(metadata);

      const msg = await this.messagesRepo.create({
        conversationId: call.conversationId,
        senderId: call.initiatorId,
        body,
        messageType: MessageType.CALL_LOG,
      });

      await this.convsService.touchUpdatedAt(call.conversationId);

      const participantIds = await this.convsService.getParticipantIds(call.conversationId);
      if (this.gateway) {
        for (const pid of participantIds) {
          const mappedMessage = this.mapper?.mapMessage(msg, pid, new Set());
          if (mappedMessage) {
            this.gateway.emitToUser(pid, WS_EVENTS.NEW_MESSAGE, {
              conversationId: call.conversationId,
              message: mappedMessage,
            });
          }
        }
      }
    } catch (err) {
      this.logger.error(`Failed to record CALL_LOG message for call ${call.id}: ${String(err)}`);
    }
  }

  mapToView(call: CallWithDetails): CallSessionView {
    return {
      id: call.id,
      conversationId: call.conversationId,
      type: call.type,
      status: call.status,
      initiatorId: call.initiatorId,
      initiator: call.initiator,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
      durationMs: call.durationMs,
      participants: call.participants.map((p) => ({
        id: p.id,
        callId: p.callId,
        userId: p.userId,
        user: p.user,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        muteState: p.muteState,
        videoState: p.videoState,
        screenShare: p.screenShare,
        role: p.role,
      })),
    };
  }

  private readonly localRelayNodes = new Map<
    string,
    { natType: string; maxSlots: number; updatedAt: number }
  >();

  async registerRelayNode(userId: string, natType: string, maxSlots: number = 5): Promise<void> {
    this.localRelayNodes.set(userId, { natType, maxSlots, updatedAt: Date.now() });
    try {
      const client = this.redisService.getClient();
      if (client && typeof client.sadd === 'function') {
        await client.sadd('calls:relay_nodes', userId);
        await this.redisService.set(
          `calls:relay:${userId}`,
          JSON.stringify({ userId, natType, maxSlots, updatedAt: Date.now() }),
          180,
        );
      }
    } catch {
      // Redis optional fallback to local map
    }
  }

  async allocateRelayNode(
    callId: string,
    callerId: string,
    calleeId: string,
  ): Promise<{ relayUserId: string; relaySessionId: string } | null> {
    let candidateIds: string[] = [];
    try {
      const client = this.redisService.getClient();
      if (client && typeof client.smembers === 'function') {
        candidateIds = await client.smembers('calls:relay_nodes');
      }
    } catch {
      // fallback
    }

    if (candidateIds.length === 0) {
      candidateIds = Array.from(this.localRelayNodes.keys());
    }

    const available = candidateIds.find((id) => id !== callerId && id !== calleeId);
    if (!available) return null;

    const relaySessionId = `relay_${callId}_${Date.now()}`;
    return { relayUserId: available, relaySessionId };
  }

  async releaseRelayNode(userId: string): Promise<void> {
    this.localRelayNodes.delete(userId);
    try {
      const client = this.redisService.getClient();
      if (client && typeof client.srem === 'function') {
        await client.srem('calls:relay_nodes', userId);
        await this.redisService.del(`calls:relay:${userId}`);
      }
    } catch {
      // fallback
    }
  }

  async createWebTransportSession(
    userId: string,
    callId: string,
  ): Promise<WebTransportSessionResponse> {
    const endpointUrl = process.env.WEBTRANSPORT_ENDPOINT_URL;
    if (!endpointUrl) {
      throw new NotFoundException('WebTransport endpoint is not configured in this environment');
    }

    const sessionTicket = `wt_${callId}_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    try {
      await this.redisService.set(
        `calls:wt_ticket:${sessionTicket}`,
        JSON.stringify({ userId, callId, createdAt: Date.now() }),
        300,
      );
    } catch {
      // fallback if Redis is offline
    }

    return {
      endpointUrl,
      sessionTicket,
      maxDatagramSize: 1200,
      quicSupported: true,
      expiresInSec: 300,
    };
  }

  async generateCallOgImage(callId: string): Promise<string> {
    const call = await this.callsRepo.findCallById(callId);

    let durationStr = '00:00';
    if (call?.startedAt) {
      const now = call.endedAt ? new Date(call.endedAt).getTime() : Date.now();
      const start = new Date(call.startedAt).getTime();
      const diffSec = Math.max(0, Math.floor((now - start) / 1000));
      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    const participants = call?.participants ?? [];
    const count = Math.max(participants.length, 1);
    const isLive = call?.status === CallStatus.CONNECTED;
    const statusText = isLive
      ? 'LIVE NOW'
      : call?.status === CallStatus.RINGING
        ? 'RINGING'
        : 'HD CALL';

    const names = participants
      .map((p) => p.user?.displayName || p.user?.username || 'Участник')
      .slice(0, 3)
      .join(', ');
    const displayTitle = names
      ? participants.length > 3
        ? `${names} +${participants.length - 3}`
        : names
      : 'Групповой HD-звонок';

    const avatarElements = participants
      .slice(0, 4)
      .map((p, idx) => {
        const letter = (p.user?.displayName || p.user?.username || 'U')[0].toUpperCase();
        const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B'];
        const color = colors[idx % colors.length];
        return `
      <g transform="translate(${idx * 56}, 0)">
        <circle cx="36" cy="36" r="36" fill="${color}" stroke="#18181B" stroke-width="4"/>
        <text x="36" y="44" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="700" text-anchor="middle">${this.escapeXml(letter)}</text>
      </g>
      `;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#09090B"/>
  <defs>
    <radialGradient id="glowTopRight" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1050 80) rotate(90) scale(400)">
      <stop stop-color="#6366F1" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#6366F1" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowBottomLeft" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(150 550) rotate(90) scale(450)">
      <stop stop-color="#A855F7" stop-opacity="0.2"/>
      <stop offset="1" stop-color="#A855F7" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cardBorder" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="white" stop-opacity="0.15"/>
      <stop offset="0.5" stop-color="white" stop-opacity="0.05"/>
      <stop offset="1" stop-color="white" stop-opacity="0.1"/>
    </linearGradient>
    <linearGradient id="btnGradient" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#6366F1"/>
      <stop offset="1" stop-color="#8B5CF6"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#glowTopRight)"/>
  <rect width="1200" height="630" fill="url(#glowBottomLeft)"/>

  <rect x="32" y="32" width="1136" height="566" rx="36" fill="#18181B" fill-opacity="0.6" stroke="url(#cardBorder)" stroke-width="2"/>

  <g transform="translate(80, 80)">
    <rect width="160" height="40" rx="20" fill="#27272A" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <text x="80" y="25" fill="#E4E4E7" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" text-anchor="middle" letter-spacing="1">ANTIGRAVITY</text>

    <g transform="translate(176, 0)">
      <rect width="${isLive ? 120 : 140}" height="40" rx="20" fill="${isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)'}" stroke="${isLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}" stroke-width="1"/>
      <circle cx="20" cy="20" r="5" fill="${isLive ? '#10B981' : '#6366F1'}"/>
      <text x="35" y="25" fill="${isLive ? '#34D399' : '#A5B4FC'}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="0.5">${statusText}</text>
    </g>

    ${
      isLive
        ? `
    <g transform="translate(312, 0)">
      <rect width="100" height="40" rx="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
      <text x="50" y="25" fill="#A1A1AA" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace" font-size="14" font-weight="600" text-anchor="middle">${durationStr}</text>
    </g>
    `
        : ''
    }
  </g>

  <g transform="translate(80, 200)">
    <text x="0" y="60" fill="#FAFAFA" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="800" letter-spacing="-1">
      ${this.escapeXml(displayTitle)}
    </text>

    <text x="0" y="115" fill="#A1A1AA" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="500">
      Защищенный HD-звонок • ${count} ${count === 1 ? 'участник' : count < 5 ? 'участника' : 'участников'} • Присоединиться
    </text>
  </g>

  <g transform="translate(80, 390)">
    ${avatarElements}
  </g>

  <g transform="translate(830, 440)">
    <rect width="250" height="64" rx="32" fill="url(#btnGradient)"/>
    <text x="125" y="39" fill="#FFFFFF" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700" text-anchor="middle" letter-spacing="0.5">Вход в звонок →</text>
  </g>

  <g transform="translate(80, 540)">
    <text x="0" y="0" fill="#71717A" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500">
      🔒 End-to-End Encrypted (AES-256-GCM + Argon2id) • Direct Peer-to-Peer
    </text>
  </g>
</svg>`;
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '&':
          return '&amp;';
        case "'":
          return '&apos;';
        case '"':
          return '&quot;';
        default:
          return c;
      }
    });
  }
}
