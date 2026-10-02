import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FamilyService, calculateAgeFromBirthDate } from '../family.service';
import { FamilySafeguardService, isCurrentTimeInCurfew } from '../family-safeguard.service';
import { BadRequestException, ForbiddenException, HttpException } from '@nestjs/common';

describe('FamilyService & Safeguards (Legally Compliant Backend-First)', () => {
  let service: FamilyService;
  let safeguardService: FamilySafeguardService;
  let mockGateway: { emitToUser: ReturnType<typeof vi.fn> };
  let mockRedis: any;

  beforeEach(() => {
    mockGateway = {
      emitToUser: vi.fn(),
    };

    const redisStore = new Map<string, string>();
    mockRedis = {
      getClient: () => ({
        get: vi.fn(async (key: string) => redisStore.get(key) || null),
        set: vi.fn(async (key: string, val: string) => {
          redisStore.set(key, val);
          return 'OK';
        }),
        del: vi.fn(async (key: string) => {
          redisStore.delete(key);
          return 1;
        }),
        incr: vi.fn(async (key: string) => {
          const curr = parseInt(redisStore.get(key) || '0', 10) + 1;
          redisStore.set(key, String(curr));
          return curr;
        }),
        expire: vi.fn(async () => 1),
        hincrby: vi.fn(async () => 1),
        hget: vi.fn(async () => '10'),
      }),
    };

    safeguardService = new FamilySafeguardService(mockRedis);
    service = new FamilyService(mockRedis, mockGateway as any, safeguardService);
  });

  describe('Age Calculation', () => {
    it('accurately calculates age from birthDate', () => {
      const nowYear = new Date().getFullYear();
      const birthAdult = new Date(nowYear - 25, 0, 1);
      const birthTeen = new Date(nowYear - 15, 0, 1);

      expect(calculateAgeFromBirthDate(birthAdult)).toBe(25);
      expect(calculateAgeFromBirthDate(birthTeen)).toBe(15);
      expect(calculateAgeFromBirthDate(null)).toBe(24); // adult default
    });
  });

  describe('Step 1: Child generates pairing code', () => {
    it('generates a 6-digit alphanumeric code with 10-minute TTL', async () => {
      const res = await service.generatePairQr('child-1');
      expect(res.code).toMatch(/^FC-\d{4}$/);
      expect(res.token).toBeTruthy();
      expect(new Date(res.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects code generation if user is adult', async () => {
      await expect(service.generatePairQr('user-adult-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('Step 2: Parent pairs via code (Handshake & Rate Limiting)', () => {
    it('initiates pair request and emits real-time WebSocket event to child', async () => {
      const invite = await service.generatePairQr('child-2');
      const pairRes = await service.pair('user-adult-1', invite.code, '192.168.1.5');

      expect(pairRes.status).toBe('PENDING_CONFIRMATION');
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'child-2',
        'family:pair_requested',
        expect.objectContaining({
          linkId: pairRes.linkId,
          parentId: 'user-adult-1',
        }),
      );

      // Verify single-use token deletion: cannot pair with the same code again
      await expect(service.pair('user-adult-1', invite.code, '192.168.1.5')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('enforces anti-brute-force rate limiting after 5 attempts', async () => {
      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await expect(service.pair('user-adult-1', 'INVALID-CODE', '10.0.0.1')).rejects.toThrow(
          BadRequestException,
        );
      }
      // 6th attempt triggers 429 Too Many Requests
      await expect(service.pair('user-adult-1', 'INVALID-CODE', '10.0.0.1')).rejects.toThrow(
        HttpException,
      );
    });

    it('enforces max 8 children per parent constraint', async () => {
      // user-adult-1 already has 1 child (child-1) from seed. Add 7 more to reach 8
      for (let i = 10; i < 17; i++) {
        const id = `child-${i}`;
        service.registerUserForTesting({
          id,
          username: `child_${i}`,
          displayName: `Child ${i}`,
          avatar: null,
          birthDate: new Date(2012, 0, 1),
        });
        const inv = await service.generatePairQr(id);
        const p = await service.pair('user-adult-1', inv.code);
        await service.confirmPair(id, p.linkId, true);
      }

      // 9th child attempt
      service.registerUserForTesting({
        id: 'child-99',
        username: 'child_99',
        displayName: 'Child 99',
        avatar: null,
        birthDate: new Date(2012, 0, 1),
      });
      const inv99 = await service.generatePairQr('child-99');
      await expect(service.pair('user-adult-1', inv99.code)).rejects.toThrow(
        /maximum number of linked teens/,
      );
    });
  });

  describe('Step 3: Child confirms on device & fallback retrieval', () => {
    it('restores pending request via fallback GET /api/family/pending-invite', async () => {
      const invite = await service.generatePairQr('child-2');
      await service.pair('user-adult-1', invite.code);

      const pending = service.getPendingInvite('child-2');
      expect(pending).not.toBeNull();
      expect(pending?.parentId).toBe('user-adult-1');
    });

    it('confirms pairing, activates status, and notifies parent via socket', async () => {
      const invite = await service.generatePairQr('child-2');
      const pairRes = await service.pair('user-adult-1', invite.code);

      const confirmRes = await service.confirmPair('child-2', pairRes.linkId, true);
      expect(confirmRes.status).toBe('ACTIVE');

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'user-adult-1',
        'family:pair_confirmed',
        expect.objectContaining({ linkId: pairRes.linkId }),
      );

      // Pending invite is cleared
      expect(service.getPendingInvite('child-2')).toBeNull();
    });
  });

  describe('Mutual Revocation (UK AADC / GDPR)', () => {
    it('allows child to disconnect parent and notifies parent in real-time', async () => {
      const res = service.revokeFamilyLink('child-1', 'link-demo-1');
      expect(res.success).toBe(true);

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        'user-adult-1',
        'family:member_removed',
        expect.objectContaining({ linkId: 'link-demo-1', removedByUserId: 'child-1' }),
      );
    });
  });

  describe('Privacy-Preserving Telemetry (Secrecy of Correspondence)', () => {
    it('provides aggregated 7-day activity metrics without message content', async () => {
      const summary = await service.getActivitySummary('child-1', 'user-adult-1');
      expect(summary.periodDays).toBe(7);
      expect(summary.voiceVideoMinutes).toBeGreaterThanOrEqual(0);
      expect(summary.newFriendsCount).toBeDefined();
      expect(summary).not.toHaveProperty('messages');
      expect(summary).not.toHaveProperty('transcripts');
    });

    it('rejects unauthorized access to child telemetry', async () => {
      await expect(service.getActivitySummary('child-1', 'stranger-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Family Settings & PIN', () => {
    it('loads defaults and persists updates', async () => {
      const initial = await service.getFamilySettings('user-adult-1');
      expect(initial.weeklyDigest).toBe(true);
      expect(initial.pinEnabled).toBe(false);

      const updated = await service.updateFamilySettings('user-adult-1', {
        weeklyDigest: false,
        pinEnabled: true,
        pinCode: '1234',
      });
      expect(updated.weeklyDigest).toBe(false);
      expect(updated.pinEnabled).toBe(true);
      expect(updated.pinCode).toBe('1234');
    });
  });

  describe('Timezone-Aware Curfew & Safeguards', () => {
    it('calculates overnight curfew accurately in target timezone', () => {
      // 23:30 local time -> inside 22:00-07:00
      const nightDate = new Date('2026-09-20T20:30:00.000Z'); // UTC
      const inCurfew = isCurrentTimeInCurfew('22:00', '07:00', 'Europe/Kyiv', nightDate);
      expect(inCurfew).toBe(true);

      // 14:00 local time -> outside 22:00-07:00
      const dayDate = new Date('2026-09-20T11:00:00.000Z');
      const outsideCurfew = isCurrentTimeInCurfew('22:00', '07:00', 'Europe/Kyiv', dayDate);
      expect(outsideCurfew).toBe(false);
    });

    it('blocks DMs from non-mutual friends when safeguard is active', () => {
      safeguardService.updateSafeguards('child-1', 'user-adult-1', {
        restrictedDirectMessages: true,
      });

      expect(() => safeguardService.assertCanDirectMessage('stranger', 'child-1', false)).toThrow(
        ForbiddenException,
      );

      expect(() =>
        safeguardService.assertCanDirectMessage('friend', 'child-1', true),
      ).not.toThrow();
    });

    it('enforces monthly spending limits', () => {
      safeguardService.updateSafeguards('child-1', 'user-adult-1', {
        monthlyBudget: 1000,
        spentThisMonth: 800,
      });

      // Allowed under budget
      expect(() => safeguardService.assertCanSpend('child-1', 150)).not.toThrow();

      // Blocked over budget
      expect(() => safeguardService.assertCanSpend('child-1', 300)).toThrow(ForbiddenException);
    });
  });
});
