import { SessionsController } from '../sessions.controller';
import type { SessionsService } from '../sessions.service';
import type { AuthService } from '../../auth/auth.service';
import type { RequestUser } from '../../auth/interfaces/jwt-payload.interface';

describe('SessionsController', () => {
  let controller: SessionsController;
  let mockSessionsService: {
    listForUser: jest.Mock;
    revokeById: jest.Mock;
  };
  let mockAuthService: {
    revokeRefreshByJti: jest.Mock;
    revokeOtherSessions: jest.Mock;
  };

  const mockUser: RequestUser = {
    id: 'usr-1',
    email: 'user@test.com',
    username: 'user_1',
    sessionJti: 'jti-current',
  };

  beforeEach(() => {
    mockSessionsService = {
      listForUser: jest.fn(),
      revokeById: jest.fn(),
    };

    mockAuthService = {
      revokeRefreshByJti: jest.fn().mockResolvedValue(undefined),
      revokeOtherSessions: jest.fn().mockResolvedValue(undefined),
    };

    controller = new SessionsController(
      mockSessionsService as unknown as SessionsService,
      mockAuthService as unknown as AuthService,
    );
  });

  it('list delegates to SessionsService with user ID and current session JTI', async () => {
    mockSessionsService.listForUser.mockResolvedValueOnce([]);

    const result = await controller.list(mockUser);

    expect(mockSessionsService.listForUser).toHaveBeenCalledWith('usr-1', 'jti-current');
    expect(result).toEqual([]);
  });

  it('revoke deletes session via SessionsService and revokes refresh token via AuthService', async () => {
    mockSessionsService.revokeById.mockResolvedValueOnce('jti-revoked');

    await controller.revoke(mockUser, 'sess-to-delete');

    expect(mockSessionsService.revokeById).toHaveBeenCalledWith('usr-1', 'sess-to-delete');
    expect(mockAuthService.revokeRefreshByJti).toHaveBeenCalledWith('usr-1', 'jti-revoked');
  });

  it('revokeAll revokes all other sessions in AuthService', async () => {
    await controller.revokeAll(mockUser);

    expect(mockAuthService.revokeOtherSessions).toHaveBeenCalledWith('usr-1', 'jti-current');
  });

  it('revokeAll does nothing if user does not have sessionJti', async () => {
    await controller.revokeAll({ id: 'usr-1', email: 'a@b.com', username: 'a' });

    expect(mockAuthService.revokeOtherSessions).not.toHaveBeenCalled();
  });
});
