import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '@common/prisma';
import { FamilyController } from '../family.controller';
import { FamilySafeguardService } from '../family-safeguard.service';
import { FamilyService } from '../family.service';

describe('family safeguards HTTP access', () => {
  let app: INestApplication | undefined;
  afterEach(async () => {
    vi.useRealTimers();
    await app?.close();
  });

  it('allows only the owner or active linked parent to read and only the parent to write', async () => {
    const safeguards = new FamilySafeguardService();
    const childId = 'teen';
    const parentId = 'adult';
    const teenDate = new Date(Date.UTC(new Date().getUTCFullYear() - 15, 0, 1));
    const accounts = new Map<string, Date | null>([
      [childId, teenDate],
      [parentId, new Date('1990-01-01T00:00:00Z')],
      ['underage-parent', teenDate],
      ['unknown-age', null],
    ]);
    const module = await Test.createTestingModule({
      controllers: [FamilyController],
      providers: [
        FamilyService,
        { provide: FamilySafeguardService, useValue: safeguards },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: ({ where: { id } }: { where: { id: string } }) =>
                accounts.has(id)
                  ? { id, birthDate: accounts.get(id), username: id, displayName: id, avatar: null }
                  : null,
            },
          },
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const request = context.switchToHttp().getRequest<{
            headers: { 'x-test-user'?: string };
            user?: RequestUser;
          }>();
          const id = request.headers['x-test-user'];
          if (!id) return false;
          request.user = { id, email: 'test@example.com', username: id };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');

    const family = module.get(FamilyService);
    const origin = await app.getUrl();
    const path = `${origin}/family/children/${childId}/safeguards`;
    const read = (actor: string) => fetch(path, { headers: { 'x-test-user': actor } });
    const write = (actor: string, patch: Record<string, unknown>) =>
      fetch(path, {
        method: 'PUT',
        headers: { 'x-test-user': actor, 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });

    const invite = await family.generatePairQr(childId);
    await expect(family.generatePairQr('unknown-age')).rejects.toThrow(/under 18/);
    await expect(family.pair('unknown-age', invite.code)).rejects.toThrow(/18 and older/);
    await expect(family.pair('underage-parent', invite.code)).rejects.toThrow(/18 and older/);
    const results = await Promise.allSettled([
      family.pair(parentId, invite.code),
      family.pair(parentId, invite.token),
    ]);
    const [result] = results.filter((entry) => entry.status === 'fulfilled');
    expect(results.filter((entry) => entry.status === 'fulfilled')).toHaveLength(1);
    if (!result) throw new Error('Expected one pending link');
    const link = result.value;
    expect(link).not.toHaveProperty('child');
    expect((await read(parentId)).status).toBe(403);
    expect((await write(parentId, { dailyLimitMinutes: 30 })).status).toBe(403);

    await family.confirmPair(childId, link.linkId, true);
    expect(await family.getMembers(parentId)).toMatchObject({
      connectedChildren: [{ id: childId, age: 15, birthDate: null }],
    });
    expect((await read('unrelated')).status).toBe(403);
    expect((await write('unrelated', { dailyLimitMinutes: 30 })).status).toBe(403);
    expect((await read(childId)).status).toBe(200);
    expect((await write(childId, { dailyLimitMinutes: 30 })).status).toBe(403);
    const before = await read(parentId);
    expect(before.status).toBe(200);
    expect(await before.json()).toMatchObject({
      profileSettingsLocked: true,
      profileLockedByParent: true,
    });
    expect((await write(parentId, { dailyLimitMinutes: '30' })).status).toBe(400);

    const updated = await write(parentId, {
      dailyLimitMinutes: 30,
      curfewStart: '',
      curfewTimezone: 'Europe/Kyiv',
      profileLockedByParent: false,
      childId: 'another-account',
      updatedByParentId: 'unrelated',
      spentThisMonth: 999,
    });
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({
      childId,
      dailyLimitMinutes: 30,
      curfewStart: '',
      timezone: 'Europe/Kyiv',
      profileSettingsLocked: false,
      profileLockedByParent: false,
      updatedByParentId: parentId,
      spentThisMonth: 0,
    });

    family.revokeFamilyLink(childId, link.linkId);
    await expect(family.confirmPair(childId, link.linkId, true)).rejects.toThrow(
      /no longer pending/,
    );
    expect((await read(parentId)).status).toBe(403);
    expect((await write(parentId, { dailyLimitMinutes: 60 })).status).toBe(403);
    expect(safeguards.getSafeguards(childId).dailyLimitMinutes).toBe(30);

    const newInvite = await family.generatePairQr(childId);
    const expired = await family.pair(parentId, newInvite.code);
    vi.setSystemTime(Date.now() + 600_000);
    expect(family.getPendingInvite(childId)).toBeNull();
    await expect(family.confirmPair(childId, expired.linkId, true)).rejects.toThrow(/expired/);
  });
});
