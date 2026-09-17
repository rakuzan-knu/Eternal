import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  RequestUser,
} from '../jwt-payload.interface';

describe('jwt-payload.interface', () => {
  it('should correctly type AccessTokenPayload', () => {
    const payload: AccessTokenPayload = {
      type: 'access',
      sub: 'usr-123',
      email: 'alex@example.com',
      username: 'alex',
      jti: 'jti-123',
    };

    expect(payload.type).toBe('access');
    expect(payload.sub).toBe('usr-123');
    expect(payload.email).toBe('alex@example.com');
    expect(payload.username).toBe('alex');
    expect(payload.jti).toBe('jti-123');
  });

  it('should correctly type RefreshTokenPayload', () => {
    const payload: RefreshTokenPayload = {
      type: 'refresh',
      sub: 'usr-123',
      jti: 'jti-456',
    };

    expect(payload.type).toBe('refresh');
    expect(payload.sub).toBe('usr-123');
    expect(payload.jti).toBe('jti-456');
  });

  it('should correctly type RequestUser with and without sessionJti', () => {
    const userWithoutJti: RequestUser = {
      id: 'usr-123',
      email: 'alex@example.com',
      username: 'alex',
    };

    const userWithJti: RequestUser = {
      id: 'usr-123',
      email: 'alex@example.com',
      username: 'alex',
      sessionJti: 'jti-789',
    };

    expect(userWithoutJti.id).toBe('usr-123');
    expect(userWithoutJti.sessionJti).toBeUndefined();
    expect(userWithJti.sessionJti).toBe('jti-789');
  });
});
