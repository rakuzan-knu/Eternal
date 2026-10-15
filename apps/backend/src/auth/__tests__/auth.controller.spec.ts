import type { Request, Response } from 'express';
import { AuthController } from '../auth.controller';
import type { AuthService } from '../auth.service';
import type { TurnstileService } from '../turnstile.service';
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
  let mockTurnstileService: {
    verifyToken: jest.Mock;
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

    mockTurnstileService = {
      verifyToken: jest.fn().mockResolvedValue(true),
    };

    controller = new AuthController(
      mockAuthService as unknown as AuthService,
      mockTurnstileService as unknown as TurnstileService,
    );
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

  it('sets httpOnly refreshToken cookie upon successful login when response is provided', async () => {
    const loginDto = {
      email: 'user@example.com',
      password: 'Password123!',
    };
    const mockRequest = { ip: '10.0.0.1' } as Request;
    const mockSetCookie = vi.fn();
    const mockResponse = {
      setCookie: mockSetCookie,
      cookie: vi.fn(),
    } as unknown as Response;
    const authResponse = {
      accessToken: 'access-token-123',
      refreshToken: 'cookie-refresh-token',
      user: { id: 'usr-1', email: 'user@example.com', username: 'user_one' },
    };
    mockAuthService.login.mockResolvedValueOnce(authResponse);

    const result = await controller.login(
      loginDto,
      mockRequest,
      '10.0.0.1',
      'Chrome',
      mockResponse,
    );

    expect(result).toEqual(authResponse);
    expect(mockSetCookie).toHaveBeenCalledWith(
      'refreshToken',
      'cookie-refresh-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });

  it('exchanges refresh token when token is passed exclusively via cookie', async () => {
    mockAuthService.refresh.mockResolvedValueOnce({ accessToken: 'refreshed-token' });
    const mockReq = {
      cookies: { refreshToken: 'cookie-provided-token' },
    } as unknown as Request;

    const result = await controller.refresh(undefined, mockReq);

    expect(mockAuthService.refresh).toHaveBeenCalledWith('cookie-provided-token');
    expect(result).toEqual({ accessToken: 'refreshed-token' });
  });

  it('throws UnauthorizedException when refresh token is completely missing from body and cookies', async () => {
    const mockReq = { cookies: {} } as unknown as Request;

    await expect(controller.refresh({}, mockReq)).rejects.toThrow(
      'Refresh token is missing or expired',
    );
  });

  it('clears refreshToken cookie upon logout when response object is provided', async () => {
    const user: RequestUser = {
      id: 'usr-1',
      email: 'user@example.com',
      username: 'user_one',
      sessionJti: 'session-jti-current',
    };
    const mockClearCookie = vi.fn();
    const mockResponse = {
      clearCookie: mockClearCookie,
      setCookie: vi.fn(),
    } as unknown as Response;
    const mockReq = {
      cookies: { refreshToken: 'cookie-refresh' },
    } as unknown as Request;

    await controller.logout(user, undefined, mockReq, mockResponse);

    expect(mockAuthService.logout).toHaveBeenCalledWith('usr-1', 'cookie-refresh');
    expect(mockClearCookie).toHaveBeenCalledWith(
      'refreshToken',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      }),
    );
  });
});
