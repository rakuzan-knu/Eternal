import type { Request } from 'express';
import { AuthController } from '../auth.controller';
import type { AuthService } from '../auth.service';
import type { RequestUser } from '../interfaces/jwt-payload.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: {
    checkUsername: jest.Mock;
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
    changePassword: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(() => {
    mockAuthService = {
      checkUsername: jest.fn(),
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      changePassword: jest.fn(),
      logout: jest.fn(),
    };

    controller = new AuthController(mockAuthService as unknown as AuthService);
  });

  it('delegates checkUsername query to AuthService', async () => {
    mockAuthService.checkUsername.mockResolvedValueOnce({ isAvailable: true });

    const result = await controller.checkUsername({ username: 'cool_coder' });

    expect(mockAuthService.checkUsername).toHaveBeenCalledWith('cool_coder');
    expect(result).toEqual({ isAvailable: true });
  });

  it('extracts metadata and delegates register to AuthService', async () => {
    const registerDto = {
      email: 'user@example.com',
      username: 'user_one',
      password: 'Password123!',
    };
    const mockRequest = { ip: '192.168.1.1' } as Request;
    const authResponse = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: 'usr-1', email: 'user@example.com', username: 'user_one' },
    };
    mockAuthService.register.mockResolvedValueOnce(authResponse);

    const result = await controller.register(
      registerDto,
      mockRequest,
      '192.168.1.1',
      'Mozilla/5.0',
    );

    expect(mockAuthService.register).toHaveBeenCalledWith(registerDto, {
      ip: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });
    expect(result).toEqual(authResponse);
  });

  it('extracts metadata and delegates login to AuthService', async () => {
    const loginDto = {
      email: 'user@example.com',
      password: 'Password123!',
    };
    const mockRequest = { ip: '10.0.0.1' } as Request;
    const authResponse = {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      user: { id: 'usr-1', email: 'user@example.com', username: 'user_one' },
    };
    mockAuthService.login.mockResolvedValueOnce(authResponse);

    const result = await controller.login(loginDto, mockRequest, '10.0.0.1', 'Chrome');

    expect(mockAuthService.login).toHaveBeenCalledWith(loginDto, {
      ip: '10.0.0.1',
      userAgent: 'Chrome',
    });
    expect(result).toEqual(authResponse);
  });

  it('delegates refresh token exchange to AuthService', async () => {
    mockAuthService.refresh.mockResolvedValueOnce({ accessToken: 'new-access-token' });

    const result = await controller.refresh({ refreshToken: 'valid-refresh-token' });

    expect(mockAuthService.refresh).toHaveBeenCalledWith('valid-refresh-token');
    expect(result).toEqual({ accessToken: 'new-access-token' });
  });

  it('delegates changePassword with CurrentUser context to AuthService', async () => {
    const user: RequestUser = {
      id: 'usr-1',
      email: 'user@example.com',
      username: 'user_one',
      sessionJti: 'session-jti-current',
    };
    const changePasswordDto = {
      currentPassword: 'OldPassword123!',
      newPassword: 'NewPassword456!',
    };
    mockAuthService.changePassword.mockResolvedValueOnce(undefined);

    const result = await controller.changePassword(user, changePasswordDto);

    expect(mockAuthService.changePassword).toHaveBeenCalledWith(
      'usr-1',
      changePasswordDto,
      'session-jti-current',
    );
    expect(result).toEqual({ success: true });
  });

  it('delegates logout with CurrentUser and refreshToken to AuthService', async () => {
    const user: RequestUser = {
      id: 'usr-1',
      email: 'user@example.com',
      username: 'user_one',
      sessionJti: 'session-jti-current',
    };
    mockAuthService.logout.mockResolvedValueOnce(undefined);

    await controller.logout(user, { refreshToken: 'refresh-token-to-invalidate' });

    expect(mockAuthService.logout).toHaveBeenCalledWith('usr-1', 'refresh-token-to-invalidate');
  });
});
