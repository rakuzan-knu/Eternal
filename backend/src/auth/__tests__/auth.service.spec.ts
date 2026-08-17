import { ConflictException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AuthService } from '../auth.service';
import type { RedisService } from '../../redis/redis.service';
import type { UsersService } from '../../users/users.service';
import type { SessionsService } from '../../sessions/sessions.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockUsersService: {
    findByEmail: jest.Mock;
    findByUsername: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    updatePasswordHash: jest.Mock;
  };
  let mockJwtService: {
    signAsync: jest.Mock;
    verifyAsync: jest.Mock;
  };
  let mockConfigService: {
    get: jest.Mock;
  };
  let mockRedisService: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
    exists: jest.Mock;
  };
  let mockSessionsService: {
    create: jest.Mock;
    touch: jest.Mock;
    deleteByJti: jest.Mock;
    revokeOthers: jest.Mock;
  };

  beforeEach(() => {
    mockUsersService = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updatePasswordHash: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn().mockImplementation((payload: { type?: string }) => {
        if (payload.type === 'access') return Promise.resolve('mock-access-token');
        if (payload.type === 'refresh') return Promise.resolve('mock-refresh-token');
        return Promise.resolve('token');
      }),
      verifyAsync: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, string> = {
          JWT_ACCESS_SECRET: 'access-secret-12345',
          JWT_ACCESS_TTL: '15m',
          JWT_REFRESH_SECRET: 'refresh-secret-12345',
          JWT_REFRESH_TTL: '7d',
        };
        return config[key];
      }),
    };

    mockRedisService = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(1),
    };

    mockSessionsService = {
      create: jest.fn().mockResolvedValue({ id: 'sess-1' }),
      touch: jest.fn().mockResolvedValue(undefined),
      deleteByJti: jest.fn().mockResolvedValue(undefined),
      revokeOthers: jest.fn().mockResolvedValue(['revoked-jti-1']),
    };

    service = new AuthService(
      mockUsersService as unknown as UsersService,
      mockJwtService as unknown as JwtService,
      mockConfigService as unknown as ConfigService,
      mockRedisService as unknown as RedisService,
      mockSessionsService as unknown as SessionsService,
    );
  });

  describe('checkUsername', () => {
    it('returns isAvailable: false for empty or short username', async () => {
      expect(await service.checkUsername('')).toEqual({ isAvailable: false });
      expect(await service.checkUsername('a')).toEqual({ isAvailable: false });
      expect(await service.checkUsername('   ')).toEqual({ isAvailable: false });
    });

    it('returns isAvailable: false for reserved username', async () => {
      expect(await service.checkUsername('settings')).toEqual({ isAvailable: false });
      expect(await service.checkUsername('ADMIN')).toEqual({ isAvailable: false });
      expect(await service.checkUsername('@login')).toEqual({ isAvailable: false });
    });

    it('returns isAvailable: false when username already exists in database', async () => {
      mockUsersService.findByUsername.mockResolvedValueOnce({
        id: 'usr-1',
        username: 'existing_user',
      });

      const result = await service.checkUsername('@existing_user');
      expect(result).toEqual({ isAvailable: false });
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith('existing_user');
    });

    it('returns isAvailable: true when username is valid and not taken', async () => {
      mockUsersService.findByUsername.mockResolvedValueOnce(null);

      const result = await service.checkUsername('@available_user ');
      expect(result).toEqual({ isAvailable: true });
      expect(mockUsersService.findByUsername).toHaveBeenCalledWith('available_user');
    });
  });

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      username: 'new_user',
      displayName: 'New User',
      password: 'Password123!',
      birthDate: '2000-01-01T00:00:00.000Z',
    };

    it('throws ConflictException if email is already registered', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce({ id: 'usr-1' });
      mockUsersService.findByUsername.mockResolvedValueOnce(null);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Email is already registered'),
      );
    });

    it('throws ConflictException if username is already taken', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      mockUsersService.findByUsername.mockResolvedValueOnce({ id: 'usr-1' });

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Username is already taken'),
      );
    });

    it('handles PrismaClientKnownRequestError P2002 conflict', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      mockUsersService.findByUsername.mockResolvedValueOnce(null);
      mockUsersService.create.mockRejectedValueOnce(
        new PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Email or username is already taken'),
      );
    });

    it('re-throws other unknown database errors during creation', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      mockUsersService.findByUsername.mockResolvedValueOnce(null);
      mockUsersService.create.mockRejectedValueOnce(new Error('DB connection failed'));

      await expect(service.register(registerDto)).rejects.toThrow('DB connection failed');
    });

    it('hashes password with argon2, creates user, issues token pair, and returns public user', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      mockUsersService.findByUsername.mockResolvedValueOnce(null);

      const createdUser = {
        id: 'usr-new-123',
        email: 'newuser@example.com',
        username: 'new_user',
        displayName: 'New User',
        passwordHash: 'argon2_hashed_password',
      };
      mockUsersService.create.mockResolvedValueOnce(createdUser);

      const result = await service.register(registerDto, { ip: '127.0.0.1', userAgent: 'Jest' });

      expect(mockUsersService.create).toHaveBeenCalledTimes(1);
      const createCalls = mockUsersService.create.mock.calls as unknown as [
        [{ email: string; username: string; passwordHash: string }],
      ];
      const createDto = createCalls[0][0];
      expect(createDto.email).toBe('newuser@example.com');
      expect(createDto.username).toBe('new_user');
      expect(await argon2.verify(createDto.passwordHash, 'Password123!')).toBe(true);

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user).toEqual({
        id: 'usr-new-123',
        email: 'newuser@example.com',
        username: 'new_user',
        displayName: 'New User',
      });
      expect(mockSessionsService.create).toHaveBeenCalledWith('usr-new-123', expect.any(String), {
        ip: '127.0.0.1',
        userAgent: 'Jest',
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.stringContaining('refresh:usr-new-123:'),
        '1',
        7 * 24 * 60 * 60,
      );
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException when identifier is missing or empty', async () => {
      await expect(service.login({ password: 'Password123!' })).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('throws UnauthorizedException when user is not found by email or username', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      mockUsersService.findByUsername.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'Password123!' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('throws UnauthorizedException when password verification fails', async () => {
      const passwordHash = await argon2.hash('CorrectPassword123!');
      mockUsersService.findByEmail.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'user@example.com',
        username: 'user1',
        passwordHash,
      });

      await expect(
        service.login({ email: 'user@example.com', password: 'WrongPassword999!' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('authenticates successfully by email and returns token pair and public user', async () => {
      const passwordHash = await argon2.hash('Secret12345!');
      mockUsersService.findByEmail.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'user@example.com',
        username: 'user1',
        displayName: 'User One',
        passwordHash,
      });

      const result = await service.login({ email: 'user@example.com', password: 'Secret12345!' });

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user).toEqual({
        id: 'usr-1',
        email: 'user@example.com',
        username: 'user1',
        displayName: 'User One',
      });
    });

    it('authenticates successfully by identity/username', async () => {
      const passwordHash = await argon2.hash('Secret12345!');
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      mockUsersService.findByUsername.mockResolvedValueOnce({
        id: 'usr-2',
        email: 'handle@example.com',
        username: 'handle_user',
        displayName: null,
        passwordHash,
      });

      const result = await service.login({ identity: '@handle_user', password: 'Secret12345!' });

      expect(result.user.username).toBe('handle_user');
      expect(result.user.displayName).toBeNull();
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when refresh token cannot be verified', async () => {
      mockJwtService.verifyAsync.mockRejectedValueOnce(new Error('Invalid token'));

      await expect(service.refresh('bad-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('throws UnauthorizedException when payload type is not "refresh"', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        type: 'access',
        sub: 'usr-1',
        jti: 'jti-1',
      });

      await expect(service.refresh('access-as-refresh-token')).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );
    });

    it('throws UnauthorizedException when refresh token is not found in Redis', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        type: 'refresh',
        sub: 'usr-1',
        jti: 'jti-1',
      });
      mockRedisService.exists.mockResolvedValueOnce(0);

      await expect(service.refresh('valid-jwt-token')).rejects.toThrow(
        new UnauthorizedException('Refresh token is invalid or expired'),
      );
    });

    it('throws UnauthorizedException when user no longer exists', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        type: 'refresh',
        sub: 'usr-deleted',
        jti: 'jti-1',
      });
      mockRedisService.exists.mockResolvedValueOnce(1);
      mockUsersService.findById.mockResolvedValueOnce(null);

      await expect(service.refresh('valid-jwt-token')).rejects.toThrow(
        new UnauthorizedException('User no longer exists'),
      );
    });

    it('touches session and issues new access token on valid refresh', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        type: 'refresh',
        sub: 'usr-1',
        jti: 'jti-abc',
      });
      mockRedisService.exists.mockResolvedValueOnce(1);
      mockUsersService.findById.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'user@example.com',
        username: 'user1',
      });

      const result = await service.refresh('valid-jwt-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(mockSessionsService.touch).toHaveBeenCalledWith('jti-abc');
    });
  });

  describe('logout', () => {
    it('throws UnauthorizedException when token subject does not match authenticated userId', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        type: 'refresh',
        sub: 'other-user',
        jti: 'jti-1',
      });

      await expect(service.logout('current-user', 'valid-refresh-token')).rejects.toThrow(
        new UnauthorizedException('Refresh token does not belong to the current user'),
      );
    });

    it('deletes refresh token from Redis and removes session on successful logout', async () => {
      mockJwtService.verifyAsync.mockResolvedValueOnce({
        type: 'refresh',
        sub: 'usr-1',
        jti: 'jti-100',
      });

      await service.logout('usr-1', 'valid-refresh-token');

      expect(mockRedisService.del).toHaveBeenCalledWith('refresh:usr-1:jti-100');
      expect(mockSessionsService.deleteByJti).toHaveBeenCalledWith('jti-100');
    });
  });

  describe('changePassword', () => {
    it('throws UnauthorizedException when user is not found', async () => {
      mockUsersService.findById.mockResolvedValueOnce(null);

      await expect(
        service.changePassword('usr-1', {
          currentPassword: 'CurrentPassword123!',
          newPassword: 'NewPassword456!',
        }),
      ).rejects.toThrow(new UnauthorizedException('User no longer exists'));
    });

    it('throws UnauthorizedException when current password is wrong', async () => {
      const hash = await argon2.hash('CorrectCurrentPassword123!');
      mockUsersService.findById.mockResolvedValueOnce({ id: 'usr-1', passwordHash: hash });

      await expect(
        service.changePassword('usr-1', {
          currentPassword: 'WrongCurrentPassword999!',
          newPassword: 'NewPassword456!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Current password is incorrect'));
    });

    it('updates password hash and revokes other sessions when keepJti is specified', async () => {
      const currentHash = await argon2.hash('OldPassword123!');
      mockUsersService.findById.mockResolvedValueOnce({ id: 'usr-1', passwordHash: currentHash });
      mockUsersService.updatePasswordHash.mockResolvedValueOnce({ id: 'usr-1' });

      await service.changePassword(
        'usr-1',
        { currentPassword: 'OldPassword123!', newPassword: 'NewPassword456!' },
        'keep-this-jti',
      );

      expect(mockUsersService.updatePasswordHash).toHaveBeenCalledTimes(1);
      const updateCallArgs = mockUsersService.updatePasswordHash.mock.calls[0] as [string, string];
      const newHash = updateCallArgs[1];
      expect(await argon2.verify(newHash, 'NewPassword456!')).toBe(true);

      expect(mockSessionsService.revokeOthers).toHaveBeenCalledWith('usr-1', 'keep-this-jti');
      expect(mockRedisService.del).toHaveBeenCalledWith('refresh:usr-1:revoked-jti-1');
    });
  });

  describe('revokeRefreshByJti & revokeOtherSessions', () => {
    it('deletes refresh token from redis by userId and jti', async () => {
      await service.revokeRefreshByJti('usr-1', 'jti-99');
      expect(mockRedisService.del).toHaveBeenCalledWith('refresh:usr-1:jti-99');
    });

    it('revokes other sessions and cleans up redis tokens', async () => {
      mockSessionsService.revokeOthers.mockResolvedValueOnce(['jti-a', 'jti-b']);
      await service.revokeOtherSessions('usr-1', 'active-jti');

      expect(mockSessionsService.revokeOthers).toHaveBeenCalledWith('usr-1', 'active-jti');
      expect(mockRedisService.del).toHaveBeenCalledWith('refresh:usr-1:jti-a');
      expect(mockRedisService.del).toHaveBeenCalledWith('refresh:usr-1:jti-b');
    });
  });

  describe('Missing environment variables and fallback TTL parser', () => {
    it('throws error when required config is missing', async () => {
      mockUsersService.findByEmail.mockResolvedValueOnce(null);
      mockUsersService.findByUsername.mockResolvedValueOnce(null);
      mockUsersService.create.mockResolvedValueOnce({
        id: 'usr-1',
        email: 'err@test.com',
        username: 'err_user',
        displayName: null,
      });
      mockConfigService.get.mockReturnValue(undefined);

      await expect(
        service.register({
          email: 'err@test.com',
          username: 'err_user',
          password: 'Password123!',
        }),
      ).rejects.toThrow(/Missing required environment variable/);
    });
  });
});
