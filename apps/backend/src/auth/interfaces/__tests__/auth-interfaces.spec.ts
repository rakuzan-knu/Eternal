import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  RequestUser,
} from '../jwt-payload.interface';
import type { PublicUser } from '../public-user.interface';
import type { TokenPair } from '../token-pair.interface';

describe('auth interfaces', () => {
  it('conforms to AccessTokenPayload and RefreshTokenPayload shapes', () => {
    const access: AccessTokenPayload = {
      type: 'access',
      sub: 'usr-1',
      email: 'usr@test.com',
      username: 'usr1',
      jti: 'jti-1',
    };
    expect(access.type).toBe('access');
    expect(access.sub).toBe('usr-1');

    const refresh: RefreshTokenPayload = {
      type: 'refresh',
      sub: 'usr-1',
      jti: 'jti-2',
    };
    expect(refresh.type).toBe('refresh');

    const reqUser: RequestUser = {
      id: 'usr-1',
      email: 'usr@test.com',
      username: 'usr1',
      sessionJti: 'jti-1',
    };
    expect(reqUser.id).toBe('usr-1');
  });

  it('conforms to PublicUser and TokenPair shapes', () => {
    const pubUser: PublicUser = {
      id: 'usr-1',
      email: 'usr@test.com',
      username: 'usr1',
      displayName: 'User One',
    };
    expect(pubUser.displayName).toBe('User One');

    const tokens: TokenPair = {
      accessToken: 'acc-token',
      refreshToken: 'ref-token',
    };
    expect(tokens.accessToken).toBe('acc-token');
  });
});
