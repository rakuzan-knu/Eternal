import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../jwt.strategy';
import type { UsersService } from '../../../users/users.service';
import type { AccessTokenPayload } from '../../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockConfigService: Partial<ConfigService>;
  let mockUsersService: {
    findById: jest.Mock;
  };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_ACCESS_SECRET') return 'test-jwt-secret-key-12345';
        return undefined;
      }),
    };

    mockUsersService = {
      findById: jest.fn(),
    };

    strategy = new JwtStrategy(
      mockConfigService as ConfigService,
      mockUsersService as unknown as UsersService,
    );
  });

  it('validates and returns RequestUser for valid access token payload', async () => {
    const payload: AccessTokenPayload = {
      sub: 'usr-100',
      email: 'john@example.com',
      username: 'john',
      jti: 'session-jti-xyz',
      type: 'access',
    };

    mockUsersService.findById.mockResolvedValue({
      id: 'usr-100',
      email: 'john@example.com',
      username: 'john',
    });

    const result = await strategy.validate(payload);

    expect(result).toEqual({
      id: 'usr-100',
      email: 'john@example.com',
      username: 'john',
      sessionJti: 'session-jti-xyz',
    });
    expect(mockUsersService.findById).toHaveBeenCalledWith('usr-100');
  });

  it('throws UnauthorizedException when payload type is not "access"', async () => {
    const invalidTypePayload = {
      sub: 'usr-100',
      email: 'john@example.com',
      username: 'john',
      jti: 'session-jti-xyz',
      type: 'refresh' as const,
    } as unknown as AccessTokenPayload;

    await expect(strategy.validate(invalidTypePayload)).rejects.toThrow(
      new UnauthorizedException('Invalid token type'),
    );
    expect(mockUsersService.findById).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when user cannot be found in database', async () => {
    const payload: AccessTokenPayload = {
      sub: 'deleted-user-id',
      email: 'ghost@example.com',
      username: 'ghost',
      jti: 'session-jti-xyz',
      type: 'access',
    };

    mockUsersService.findById.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(
      new UnauthorizedException('User no longer exists'),
    );
  });
});
