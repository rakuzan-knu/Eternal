import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CallsService } from '../calls.service';
import { CallStatus, CallType, CallEndReason, ParticipantRole } from '@prisma/client';

describe('CallsService - checkCallActive (Discord-style Reconnection)', () => {
  let service: CallsService;
  let mockCallsRepo: any;
  let mockMessagesRepo: any;
  let mockConvsService: any;
  let mockRedisService: any;
  let mockVisibility: any;
  let mockConfigService: any;
  let mockGateway: any;

  beforeEach(() => {
    mockCallsRepo = {
      findCallById: vi.fn(),
      updateCallStatus: vi.fn().mockResolvedValue({}),
      updateParticipantState: vi.fn().mockResolvedValue({}),
    };
    mockMessagesRepo = { create: vi.fn() };
    mockConvsService = {
      assertMember: vi.fn(),
      getParticipantIds: vi.fn(),
      getBlockRelationships: vi.fn(),
      touchUpdatedAt: vi.fn(),
    };
    mockRedisService = {
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
    };
    mockVisibility = { loadContext: vi.fn(), resolve: vi.fn() };
    mockConfigService = { get: vi.fn() };
    mockGateway = {
      isUserOnline: vi.fn().mockReturnValue(true),
      emitToUser: vi.fn(),
    };

    service = new CallsService(
      mockCallsRepo,
      mockMessagesRepo,
      mockConvsService,
      mockRedisService,
      mockVisibility,
      mockConfigService,
      undefined,
      mockGateway,
    );
  });

  it('should return NOT_FOUND if call does not exist', async () => {
    mockCallsRepo.findCallById.mockResolvedValue(null);

    const result = await service.checkCallActive('non-existent-call', 'user-1');
    expect(result.active).toBe(false);
    expect(result.reason).toBe('NOT_FOUND');
  });

  it('should return FORBIDDEN if user is not a participant', async () => {
    mockCallsRepo.findCallById.mockResolvedValue({
      id: 'call-1',
      participants: [{ userId: 'user-2' }, { userId: 'user-3' }],
    });

    const result = await service.checkCallActive('call-1', 'user-1');
    expect(result.active).toBe(false);
    expect(result.reason).toBe('FORBIDDEN');
  });

  it('should return CALL_ENDED if call status is ENDED, DECLINED, or MISSED', async () => {
    mockCallsRepo.findCallById.mockResolvedValue({
      id: 'call-1',
      status: CallStatus.ENDED,
      participants: [{ userId: 'user-1' }, { userId: 'user-2' }],
    });

    const result = await service.checkCallActive('call-1', 'user-1');
    expect(result.active).toBe(false);
    expect(result.reason).toBe('CALL_ENDED');
  });

  it('should return NO_ACTIVE_PARTICIPANTS and end call if all other participants left', async () => {
    mockCallsRepo.findCallById.mockResolvedValue({
      id: 'call-1',
      status: CallStatus.CONNECTED,
      participants: [
        { userId: 'user-1', leftAt: null },
        { userId: 'user-2', leftAt: new Date() }, // user-2 already left
      ],
    });

    const result = await service.checkCallActive('call-1', 'user-1');
    expect(result.active).toBe(false);
    expect(result.reason).toBe('NO_ACTIVE_PARTICIPANTS');
    expect(mockCallsRepo.updateCallStatus).toHaveBeenCalledWith(
      'call-1',
      CallStatus.ENDED,
      CallEndReason.ENDED_BY_USER,
    );
  });

  it('should return active: true if call is active and at least 1 other participant is present', async () => {
    const mockCall = {
      id: 'call-1',
      conversationId: 'conv-1',
      type: CallType.AUDIO,
      status: CallStatus.CONNECTED,
      initiatorId: 'user-1',
      startedAt: new Date(Date.now() - 30000), // started 30s ago
      endedAt: null,
      durationMs: null,
      participants: [
        {
          id: 'p-1',
          callId: 'call-1',
          userId: 'user-1',
          joinedAt: new Date(),
          leftAt: null,
          muteState: false,
          videoState: false,
          screenShare: false,
          role: ParticipantRole.OWNER,
        },
        {
          id: 'p-2',
          callId: 'call-1',
          userId: 'user-2',
          joinedAt: new Date(),
          leftAt: null, // user-2 is still in the call!
          muteState: true,
          videoState: false,
          screenShare: false,
          role: ParticipantRole.MEMBER,
        },
      ],
    };

    mockCallsRepo.findCallById.mockResolvedValue(mockCall);

    const result = await service.checkCallActive('call-1', 'user-1');
    expect(result.active).toBe(true);
    expect(result.activeParticipantsCount).toBe(1);
    expect(result.call?.id).toBe('call-1');
    expect(mockCallsRepo.updateParticipantState).toHaveBeenCalledWith('call-1', 'user-1', {
      leftAt: null,
      joinedAt: expect.any(Date),
    });
  });
});
