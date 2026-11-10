import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { FamilyController } from '../family.controller';
import { FamilySafeguardService } from '../family-safeguard.service';
import { FamilyService } from '../family.service';

describe('Family HTTP authorization and input boundaries', () => {
  let app: INestApplication;
  let origin: string;
  const family = {
    isActiveParentOf: vi.fn(),
    pair: vi.fn(),
    confirmPair: vi.fn(),
    updateFamilySettings: vi.fn(),
  };
  const safeguards = { getSafeguards: vi.fn(), updateSafeguards: vi.fn() };
  beforeEach(async () => {
    vi.resetAllMocks();
    family.isActiveParentOf.mockImplementation(
      async (parent: string, child: string) => parent === 'parent' && child === 'teen',
    );
    safeguards.getSafeguards.mockResolvedValue({ childId: 'teen' });
    safeguards.updateSafeguards.mockImplementation(
      async (childId: string, parentId: string, patch: Record<string, unknown>) => ({
        childId,
        parentId,
        ...patch,
      }),
    );
    const module = await Test.createTestingModule({
      controllers: [FamilyController],
      providers: [
        { provide: FamilyService, useValue: family },
        { provide: FamilySafeguardService, useValue: safeguards },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context
            .switchToHttp()
            .getRequest<{ headers: { 'x-test-user'?: string }; user?: RequestUser }>();
          const id = req.headers['x-test-user'];
          if (!id) return false;
          req.user = { id, email: 'test@example.com', username: id };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    origin = await app.getUrl();
  });
  afterEach(async () => {
    await app.close();
  });
  const send = (path: string, user: string, method = 'GET', body?: unknown) =>
    fetch(`${origin}/family/${path}`, {
      method,
      headers: { 'x-test-user': user, 'content-type': 'application/json' },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

  it('awaits parent authorization and permits only the child or linked parent reads', async () => {
    expect((await send('children/teen/safeguards', 'unrelated')).status).toBe(403);
    expect((await send('children/teen/safeguards', 'teen')).status).toBe(200);
    expect((await send('children/teen/safeguards', 'parent')).status).toBe(200);
    expect(
      (await send('children/teen/safeguards', 'teen', 'PUT', { dailyLimitMinutes: 30 })).status,
    ).toBe(403);
    expect(
      (await send('children/teen/safeguards', 'unrelated', 'PUT', { dailyLimitMinutes: 30 }))
        .status,
    ).toBe(403);
    expect(safeguards.updateSafeguards).not.toHaveBeenCalled();
  });
  it('validates safeguard values and strips protected fields', async () => {
    expect(
      (await send('children/teen/safeguards', 'parent', 'PUT', { dailyLimitMinutes: '30' })).status,
    ).toBe(400);
    expect(
      (await send('children/teen/safeguards', 'parent', 'PUT', { curfewStart: '25:00' })).status,
    ).toBe(400);
    expect(
      (await send('children/teen/safeguards', 'parent', 'PUT', { curfewTimezone: 'unknown' }))
        .status,
    ).toBe(400);
    expect(
      (
        await send('children/teen/safeguards', 'parent', 'PUT', {
          dailyLimitMinutes: 30,
          childId: 'other',
          spentThisMonth: 999,
          profileLockedByParent: false,
        })
      ).status,
    ).toBe(200);
    expect(safeguards.updateSafeguards).toHaveBeenCalledWith('teen', 'parent', {
      dailyLimitMinutes: 30,
      profileSettingsLocked: false,
    });
  });
  it('requires strict pairing, boolean child consent, and bounded settings', async () => {
    expect((await send('pair', 'parent', 'POST', { code: 12 })).status).toBe(400);
    expect((await send('pair', 'parent', 'POST', { code: '' })).status).toBe(400);
    expect(
      (await send('confirm', 'teen', 'POST', { linkId: 'link', approved: 'false' })).status,
    ).toBe(400);
    expect((await send('settings', 'parent', 'PUT', { pinEnabled: 'yes' })).status).toBe(400);
    expect((await send('settings', 'parent', 'PUT', { pinCode: 'x' })).status).toBe(400);
    expect(family.pair).not.toHaveBeenCalled();
    expect(family.confirmPair).not.toHaveBeenCalled();
    expect(family.updateFamilySettings).not.toHaveBeenCalled();
  });
});
