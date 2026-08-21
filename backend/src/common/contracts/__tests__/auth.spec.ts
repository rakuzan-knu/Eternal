import {
  HARDENED_USERNAME_REGEX,
  RESERVED_USERNAMES,
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
  checkUsernameSchema,
  authResponseSchema,
} from '../auth';

describe('auth contract schemas (auth.spec.ts)', () => {
  it('should validate valid usernames against HARDENED_USERNAME_REGEX', () => {
    expect(HARDENED_USERNAME_REGEX.test('alice_99')).toBe(true);
    expect(HARDENED_USERNAME_REGEX.test('bob.builder')).toBe(true);
    expect(HARDENED_USERNAME_REGEX.test('charlie')).toBe(true);
  });

  it('should reject invalid usernames against HARDENED_USERNAME_REGEX', () => {
    expect(HARDENED_USERNAME_REGEX.test('.invalid')).toBe(false);
    expect(HARDENED_USERNAME_REGEX.test('invalid.')).toBe(false);
    expect(HARDENED_USERNAME_REGEX.test('in..valid')).toBe(false);
    expect(HARDENED_USERNAME_REGEX.test('in__valid')).toBe(false);
  });

  it('should contain default reserved usernames in RESERVED_USERNAMES', () => {
    expect(RESERVED_USERNAMES).toContain('admin');
    expect(RESERVED_USERNAMES).toContain('api');
    expect(RESERVED_USERNAMES).toContain('auth');
    expect(RESERVED_USERNAMES).toContain('root');
  });

  it('should parse valid login payload with email', () => {
    const result = loginSchema.parse({
      email: 'alex@example.com',
      password: 'password123',
    });
    expect(result.email).toBe('alex@example.com');
  });

  it('should parse valid login payload with identity', () => {
    const result = loginSchema.parse({
      identity: 'alex_99',
      password: 'password123',
    });
    expect(result.identity).toBe('alex_99');
  });

  it('should parse and normalize valid registration payload', () => {
    const result = registerSchema.parse({
      email: 'ALEX@example.com',
      username: 'Alex_99',
      displayName: 'Alex',
      password: 'StrongPassword123!',
    });
    expect(result.email).toBe('alex@example.com');
    expect(result.username).toBe('alex_99');
    expect(result.displayName).toBe('Alex');
  });

  it('should validate refreshTokenSchema and changePasswordSchema', () => {
    const refresh = refreshTokenSchema.parse({ refreshToken: 'sample-jwt' });
    expect(refresh.refreshToken).toBe('sample-jwt');

    const change = changePasswordSchema.parse({
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword123',
    });
    expect(change.currentPassword).toBe('oldPassword123');
    expect(change.newPassword).toBe('newPassword123');
  });

  it('should parse checkUsernameSchema and authResponseSchema', () => {
    const check = checkUsernameSchema.parse({ username: '@alex_dev' });
    expect(check.username).toBe('alex_dev');

    const authRes = authResponseSchema.parse({
      accessToken: 'access.jwt.payload',
      user: {
        id: 'u-1',
        email: 'alex@example.com',
        username: 'alex_dev',
        displayName: 'Alex',
      },
    });
    expect(authRes.accessToken).toBe('access.jwt.payload');
    expect(authRes.user.username).toBe('alex_dev');
  });
});
