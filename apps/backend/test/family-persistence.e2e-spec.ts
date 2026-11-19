import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { FamilyService } from '../src/family/family.service';
import { FamilySafeguardService } from '../src/family/family-safeguard.service';

const connection = process.env.FAMILY_TEST_DATABASE_URL;

describe.skipIf(!connection)('Family persistence on isolated PostgreSQL', () => {
  let prisma: PrismaService;
  let otherPrisma: PrismaService;
  let family: FamilyService;
  let restarted: FamilyService;
  let safeguards: FamilySafeguardService;
  let restartedSafeguards: FamilySafeguardService;
  const ids: string[] = [];
  const previousUrl = process.env.DATABASE_URL;
  const user = async (
    adult = false,
    birthDate: Date | null = new Date(
      Date.UTC(new Date().getUTCFullYear() - (adult ? 35 : 15), 0, 1),
    ),
  ) => {
    const id = randomUUID();
    ids.push(id);
    await prisma.user.create({
      data: {
        id,
        username: `family_${id}`,
        email: `${id}@family-test.invalid`,
        passwordHash: 'test-only',
        birthDate,
      },
    });
    return id;
  };
  const pending = async (parentId: string, childId: string) => {
    const invite = await family.generatePairQr(childId);
    return family.pair(parentId, invite.token);
  };
  const link = async (parentId: string, childId: string) => {
    const request = await pending(parentId, childId);
    await family.confirmPair(childId, request.linkId, true);
    return request.linkId;
  };
  beforeAll(async () => {
    if (!connection) throw new Error('Explicit disposable database required');
    const url = new URL(connection);
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/family_persistence_test'
    )
      throw new Error('Only disposable loopback family_persistence_test is accepted');
    process.env.DATABASE_URL = connection;
    prisma = new PrismaService();
    otherPrisma = new PrismaService();
    await Promise.all([prisma.$connect(), otherPrisma.$connect()]);
    safeguards = new FamilySafeguardService(prisma);
    restartedSafeguards = new FamilySafeguardService(otherPrisma);
    family = new FamilyService(prisma, safeguards);
    restarted = new FamilyService(otherPrisma, restartedSafeguards);
  });
  beforeEach(async () => {
    await prisma.follow.deleteMany({
      where: { OR: [{ followerId: { in: ids } }, { followingId: { in: ids } }] },
    });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    ids.length = 0;
  });
  afterAll(async () => {
    await prisma?.follow.deleteMany({
      where: { OR: [{ followerId: { in: ids } }, { followingId: { in: ids } }] },
    });
    await prisma?.user.deleteMany({ where: { id: { in: ids } } });
    await Promise.all([prisma?.$disconnect(), otherPrisma?.$disconnect()]);
    await Promise.all([prisma?.pool?.end(), otherPrisma?.pool?.end()]);
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
  });

  it('restores pending, active membership, settings and safeguards in a new service/client instance', async () => {
    const parent = await user(true),
      child = await user();
    const request = await pending(parent, child);
    expect(await restarted.getPendingInvite(child)).toMatchObject({
      linkId: request.linkId,
      parentId: parent,
    });
    expect(await restarted.isActiveParentOf(parent, child)).toBe(false);
    await restarted.confirmPair(child, request.linkId, true);
    await family.updateFamilySettings(parent, {
      weeklyDigest: false,
      pinEnabled: true,
      pinCode: '1234',
    });
    await safeguards.updateSafeguards(child, parent, {
      dailyLimitMinutes: 30,
      curfewStart: '22:00',
      curfewEnd: '07:00',
      timezone: 'Europe/Kyiv',
    });
    expect(await restarted.isActiveParentOf(parent, child)).toBe(true);
    expect(await restartedSafeguards.getSafeguards(child)).toMatchObject({
      dailyLimitMinutes: 30,
      timezone: 'Europe/Kyiv',
      profileSettingsLocked: true,
    });
    expect(await restarted.getMembers(parent)).toMatchObject({
      connectedChildren: [{ id: child, birthDate: null, age: 15 }],
    });
    expect(await restarted.getFamilySettings(parent)).toMatchObject({
      weeklyDigest: false,
      pinEnabled: true,
      pinCode: '',
    });
    const stored = await prisma.familySettings.findUniqueOrThrow({ where: { userId: parent } });
    expect(stored.pinHash).toMatch(/^\$argon2/);
    expect(stored.pinHash).not.toContain('1234');
    expect(await restarted.getPendingInvite(child)).toBeNull();
  });

  it('atomically consumes either code or token once across independent clients without persisting secrets', async () => {
    const parent = await user(true),
      child = await user();
    const invite = await family.generatePairQr(child);
    const stored = await prisma.familyInvite.findFirstOrThrow({ where: { childId: child } });
    expect(stored.codeHash).not.toBe(invite.code);
    expect(stored.tokenHash).not.toBe(invite.token);
    const results = await Promise.allSettled([
      family.pair(parent, invite.code),
      restarted.pair(parent, invite.token),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.familyLink.count({ where: { parentId: parent, childId: child } })).toBe(1);
    await expect(restarted.pair(parent, invite.token)).rejects.toThrow(/Invalid or expired/);
  });

  it('rechecks max two guardians under locks at concurrent child confirmation', async () => {
    const child = await user();
    const parents = await Promise.all([user(true), user(true), user(true)]);
    const requests = [];
    for (const parent of parents) requests.push(await pending(parent, child));
    const results = await Promise.allSettled(
      requests.map((request, index) =>
        (index % 2 ? restarted : family).confirmPair(child, request.linkId, true),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(2);
    expect(await prisma.familyLink.count({ where: { childId: child, status: 'ACTIVE' } })).toBe(2);
  });

  it('rechecks max eight children under locks at concurrent confirmations', async () => {
    const parent = await user(true);
    const children = await Promise.all(Array.from({ length: 9 }, () => user()));
    const requests = [];
    for (const child of children) requests.push(await pending(parent, child));
    const results = await Promise.allSettled(
      requests.map((request, index) =>
        (index % 2 ? restarted : family).confirmPair(children[index], request.linkId, true),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(8);
    expect(await prisma.familyLink.count({ where: { parentId: parent, status: 'ACTIVE' } })).toBe(
      8,
    );
  });

  it('rejects cross-user confirmation, telemetry, configuration and revocation', async () => {
    const parent = await user(true),
      child = await user(),
      outsider = await user(true);
    const request = await pending(parent, child);
    await expect(family.confirmPair(outsider, request.linkId, true)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      safeguards.updateSafeguards(child, parent, { dailyLimitMinutes: 30 }),
    ).rejects.toThrow(ForbiddenException);
    await family.confirmPair(child, request.linkId, true);
    await expect(
      safeguards.updateSafeguards(child, outsider, { dailyLimitMinutes: 30 }),
    ).rejects.toThrow(ForbiddenException);
    await expect(family.getActivitySummary(child, outsider)).rejects.toThrow(ForbiddenException);
    await expect(family.revokeFamilyLink(outsider, request.linkId)).rejects.toThrow(
      ForbiddenException,
    );
    expect(await family.isActiveParentOf(outsider, child)).toBe(false);
  });

  it('checks current age for invite, parent pairing, child confirmation and later enforcement', async () => {
    const parent = await user(true),
      child = await user(),
      unknown = await user(false, null);
    await expect(family.generatePairQr(parent)).rejects.toThrow(/under 18/);
    await expect(family.generatePairQr(unknown)).rejects.toThrow(/under 18/);
    const invite = await family.generatePairQr(child);
    await expect(family.pair(unknown, invite.code)).rejects.toThrow(/18 and older/);
    await expect(family.pair(child, invite.code)).rejects.toThrow(/18 and older/);
    const request = await family.pair(parent, invite.code);
    await prisma.user.update({
      where: { id: parent },
      data: { birthDate: new Date(Date.UTC(new Date().getUTCFullYear() - 16, 0, 1)) },
    });
    await expect(family.confirmPair(child, request.linkId, true)).rejects.toThrow(/18 and older/);
    await prisma.user.update({
      where: { id: parent },
      data: { birthDate: new Date('1990-01-01') },
    });
    await family.confirmPair(child, request.linkId, true);
    await prisma.user.update({ where: { id: child }, data: { birthDate: new Date('1990-01-01') } });
    expect(await restarted.isActiveParentOf(parent, child)).toBe(false);
    expect(await restartedSafeguards.getSafeguards(child)).toBeNull();
    await expect(
      restartedSafeguards.assertCanDirectMessage(child, parent, false),
    ).resolves.toBeUndefined();
    await expect(restartedSafeguards.assertCanChangePrivacy(child)).resolves.toBeUndefined();
    expect(await restartedSafeguards.checkScreenTime(child)).toEqual({ isBlocked: false });
  });

  it('expires invites and pending child prompts and keeps declined links inactive', async () => {
    const parent = await user(true),
      child = await user();
    const invite = await family.generatePairQr(child);
    await prisma.familyInvite.updateMany({
      where: { childId: child },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await expect(family.pair(parent, invite.code)).rejects.toThrow(/Invalid or expired/);
    const request = await pending(parent, child);
    await prisma.familyLink.update({
      where: { id: request.linkId },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    expect(await restarted.getPendingInvite(child)).toBeNull();
    await expect(restarted.confirmPair(child, request.linkId, true)).rejects.toThrow(/expired/);
    const second = await pending(parent, child);
    expect(await restarted.confirmPair(child, second.linkId, false)).toEqual({
      success: false,
      status: 'REVOKED',
    });
    await expect(restarted.confirmPair(child, second.linkId, true)).rejects.toThrow(
      /no longer pending/,
    );
    expect(await restarted.isActiveParentOf(parent, child)).toBe(false);
  });

  it('clears safeguards and usage only after the last active parent is revoked', async () => {
    const first = await user(true),
      second = await user(true),
      child = await user();
    const a = await link(first, child),
      b = await link(second, child);
    await safeguards.updateSafeguards(child, first, { dailyLimitMinutes: 30 });
    await safeguards.trackScreenTimeTick(child);
    await restarted.revokeFamilyLink(first, a);
    expect(await safeguards.getSafeguards(child)).toMatchObject({ dailyLimitMinutes: 30 });
    await family.revokeFamilyLink(child, b);
    expect(await restartedSafeguards.getSafeguards(child)).toBeNull();
    expect(await prisma.familySafeguard.count({ where: { childId: child } })).toBe(0);
    expect(await prisma.familyScreenUsage.count({ where: { userId: child } })).toBe(0);
    await expect(restartedSafeguards.assertCanChangePrivacy(child)).resolves.toBeUndefined();
  });

  it('keeps safeguards when the last editing guardian deletes their account and a second guardian remains', async () => {
    const first = await user(true),
      second = await user(true),
      child = await user();
    await link(first, child);
    await link(second, child);
    await safeguards.updateSafeguards(child, first, {
      restrictedDirectMessages: true,
      profileSettingsLocked: true,
    });
    await prisma.user.delete({ where: { id: first } });
    expect(await restartedSafeguards.getSafeguards(child)).toMatchObject({
      updatedByParentId: null,
      restrictedDirectMessages: true,
    });
    await expect(restartedSafeguards.assertCanDirectMessage(child, second, false)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(restartedSafeguards.assertCanChangePrivacy(child)).rejects.toThrow(
      ForbiddenException,
    );
    await prisma.user.delete({ where: { id: second } });
    expect(await restartedSafeguards.getSafeguards(child)).toBeNull();
  });

  it('cascades child deletion to every persisted family row', async () => {
    const parent = await user(true),
      child = await user();
    await link(parent, child);
    await family.generatePairQr(child);
    await family.updateFamilySettings(child, { weeklyDigest: false });
    await safeguards.trackScreenTimeTick(child);
    await prisma.familyPairAttempts.create({ data: { userId: child, attempts: 1 } });
    await prisma.user.delete({ where: { id: child } });
    expect(await prisma.familyLink.count({ where: { childId: child } })).toBe(0);
    expect(await prisma.familyInvite.count({ where: { childId: child } })).toBe(0);
    expect(await prisma.familySafeguard.count({ where: { childId: child } })).toBe(0);
    expect(await prisma.familySettings.count({ where: { userId: child } })).toBe(0);
    expect(await prisma.familyScreenUsage.count({ where: { userId: child } })).toBe(0);
    expect(await prisma.familyPairAttempts.count({ where: { userId: child } })).toBe(0);
  });

  it('does not persist default configuration or block adults and unlinked teens', async () => {
    const adult = await user(true),
      child = await user();
    for (const id of [adult, child]) {
      expect(await safeguards.getSafeguards(id)).toBeNull();
      expect(await safeguards.checkScreenTime(id)).toEqual({ isBlocked: false });
      expect(await safeguards.trackScreenTimeTick(id)).toBe(0);
      await expect(safeguards.assertCanChangePrivacy(id)).resolves.toBeUndefined();
      await expect(safeguards.assertCanDirectMessage(id, adult, false)).resolves.toBeUndefined();
    }
    expect(await prisma.familySafeguard.count({ where: { childId: { in: [adult, child] } } })).toBe(
      0,
    );
  });

  it('enforces DM restrictions in both directions and permits actual mutual follows', async () => {
    const parent = await user(true),
      child = await user(),
      outsider = await user(true);
    await link(parent, child);
    await expect(safeguards.assertCanDirectMessage(child, outsider)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(restartedSafeguards.assertCanDirectMessage(outsider, child)).rejects.toThrow(
      ForbiddenException,
    );
    await prisma.follow.createMany({
      data: [
        { followerId: child, followingId: outsider, status: 'ACCEPTED' },
        { followerId: outsider, followingId: child, status: 'ACCEPTED' },
      ],
    });
    await expect(
      restartedSafeguards.assertCanDirectMessage(outsider, child),
    ).resolves.toBeUndefined();
  });

  it('deduplicates authenticated activity across processes within a UTC minute and persists quota', async () => {
    const parent = await user(true),
      child = await user();
    await link(parent, child);
    await safeguards.updateSafeguards(child, parent, { dailyLimitMinutes: 1 });
    const counts = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        (index % 2 ? restartedSafeguards : safeguards).trackScreenTimeTick(child),
      ),
    );
    expect(counts).toEqual([1, 1, 1, 1, 1, 1]);
    expect(await restartedSafeguards.checkScreenTime(child)).toEqual({ isBlocked: false });
    await expect(restartedSafeguards.assertCanUse(child)).resolves.toBeUndefined();
    const today = new Date().toISOString().slice(0, 10);
    await prisma.familyScreenUsage.update({
      where: { userId_utcDate: { userId: child, utcDate: today } },
      data: { lastMinute: 'earlier-minute' },
    });
    expect(await restartedSafeguards.checkScreenTime(child)).toMatchObject({
      isBlocked: true,
      reason: 'DAILY_LIMIT_REACHED',
    });
    await expect(restartedSafeguards.assertCanUse(child)).rejects.toThrow(ForbiddenException);
    expect(await restartedSafeguards.trackScreenTimeTick(child)).toBe(2);
    expect(await restartedSafeguards.checkScreenTime(child)).toMatchObject({
      isBlocked: true,
      reason: 'DAILY_LIMIT_REACHED',
    });
  });

  it('rate limits failed pairing attempts durably across client instances', async () => {
    const parent = await user(true);
    for (let attempt = 0; attempt < 5; attempt++)
      await expect((attempt % 2 ? restarted : family).pair(parent, 'invalid')).rejects.toThrow(
        /Invalid or expired/,
      );
    await expect(restarted.pair(parent, 'invalid')).rejects.toThrow(/Too many pairing/);
    expect(await prisma.familyPairAttempts.findUnique({ where: { userId: parent } })).toMatchObject(
      { attempts: 5 },
    );
  });

  it('exports only own family data without invite secrets, PIN hashes or another account details', async () => {
    const parent = await user(true),
      child = await user(),
      other = await user(true),
      otherChild = await user();
    await link(parent, child);
    await link(other, otherChild);
    await family.updateFamilySettings(child, { pinEnabled: true, pinCode: '1234' });
    const invite = await family.generatePairQr(child);
    const own = await restartedSafeguards.getOwnData(child);
    expect(own.links).toHaveLength(1);
    expect(own.links[0]).toMatchObject({ parentId: parent, childId: child });
    expect(own.settings).toMatchObject({ pinEnabled: true });
    const serialized = JSON.stringify(own);
    for (const excluded of [
      'passwordHash',
      'birthDate',
      'email',
      'pinHash',
      'codeHash',
      'tokenHash',
      invite.code,
      invite.token,
      otherChild,
    ])
      expect(serialized).not.toContain(excluded);
  });

  it('bounds family export history and explicitly identifies records requiring assisted access', async () => {
    const parent = await user(true),
      child = await user();
    await prisma.familyLink.createMany({
      data: Array.from({ length: 101 }, () => ({
        parentId: parent,
        childId: child,
        status: 'REVOKED' as const,
        expiresAt: new Date(),
      })),
    });
    const own = await safeguards.getOwnData(child);
    expect(own.links).toHaveLength(100);
    expect(own.totalLinks).toBe(101);
    expect(own.hasMoreLinks).toBe(true);
    expect(own.limitations).toHaveLength(1);
  });
});
