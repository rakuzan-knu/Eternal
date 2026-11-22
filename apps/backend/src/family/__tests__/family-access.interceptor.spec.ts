import { ForbiddenException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Test } from '@nestjs/testing';
import { lastValueFrom, of } from 'rxjs';
import { FamilyAccessInterceptor } from '../family-access.interceptor';
import { FamilySafeguardService } from '../family-safeguard.service';
import { BypassCurfew, BYPASS_CURFEW_KEY } from '../decorators/bypass-curfew.decorator';
import {
  CoreDataExportController,
  MessengerDataExportController,
} from '../../data-export/data-export.controller';
import { UsersController } from '../../users/users.controller';
import { ConversationsController } from '../../messenger/conversations/conversations.controller';
import { MessengerGateway } from '../../messenger/gateway/messenger.gateway';
import { Reflector } from '@nestjs/core';

class Fixture {
  read() {}
  @BypassCurfew()
  safety() {}
}

describe('Family access after authentication', () => {
  const safeguards = { assertCanUse: vi.fn(), trackScreenTimeTick: vi.fn() };
  let interceptor: FamilyAccessInterceptor;
  beforeEach(async () => {
    vi.clearAllMocks();
    safeguards.assertCanUse.mockResolvedValue(undefined);
    safeguards.trackScreenTimeTick.mockResolvedValue(1);
    const module = await Test.createTestingModule({
      providers: [
        FamilyAccessInterceptor,
        { provide: FamilySafeguardService, useValue: safeguards },
      ],
    }).compile();
    interceptor = module.get(FamilyAccessInterceptor);
  });
  const next = { handle: vi.fn(() => of('handler result')) };

  it('checks the authenticated user before executing a handler and counts only admitted activity', async () => {
    const context = new ExecutionContextHost(
      [{ user: { id: 'synthetic-teen' } }],
      Fixture,
      Fixture.prototype.read,
    );
    safeguards.assertCanUse.mockRejectedValueOnce(new ForbiddenException());
    await expect(interceptor.intercept(context, next)).rejects.toThrow(ForbiddenException);
    expect(next.handle).not.toHaveBeenCalled();
    expect(safeguards.trackScreenTimeTick).not.toHaveBeenCalled();
    expect(await lastValueFrom(await interceptor.intercept(context, next))).toBe('handler result');
    expect(safeguards.trackScreenTimeTick).toHaveBeenCalledWith('synthetic-teen');
  });

  it('does not create limits for anonymous requests or intercept safety bypasses', async () => {
    for (const { request, handler } of [
      { request: {}, handler: Fixture.prototype.read },
      { request: { user: { id: 'synthetic-teen' } }, handler: Fixture.prototype.safety },
    ]) {
      const context = new ExecutionContextHost([request], Fixture, handler);
      await lastValueFrom(await interceptor.intercept(context, next));
    }
    expect(safeguards.assertCanUse).not.toHaveBeenCalled();
    expect(safeguards.trackScreenTimeTick).not.toHaveBeenCalled();
  });

  it('preserves data-rights, blocking, reporting and leaving on both service roles', () => {
    const reflector = new Reflector();
    const handlers = [
      [CoreDataExportController, CoreDataExportController.prototype.download],
      [MessengerDataExportController, MessengerDataExportController.prototype.download],
      [UsersController, UsersController.prototype.deleteUser],
      [UsersController, UsersController.prototype.blockUser],
      [ConversationsController, ConversationsController.prototype.block],
      [ConversationsController, ConversationsController.prototype.report],
      [MessengerGateway, MessengerGateway.prototype.handleVoiceMeshLeave],
    ] as const;
    for (const [controller, handler] of handlers) {
      expect(reflector.getAllAndOverride(BYPASS_CURFEW_KEY, [handler, controller])).toBe(true);
    }
  });
});
