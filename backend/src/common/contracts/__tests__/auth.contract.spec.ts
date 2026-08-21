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

describe('auth.contract', () => {
  describe('HARDENED_USERNAME_REGEX', () => {
    it('accepts valid usernames', () => {
      expect(HARDENED_USERNAME_REGEX.test('john_doe')).toBe(true);
      expect(HARDENED_USERNAME_REGEX.test('john.doe')).toBe(true);
      expect(HARDENED_USERNAME_REGEX.test('alice123')).toBe(true);
      expect(HARDENED_USERNAME_REGEX.test('ab')).toBe(true);
    });

    it('rejects invalid usernames (starting/ending with dot/underscore, consecutive dots/underscores, too short/long)', () => {
      expect(HARDENED_USERNAME_REGEX.test('.john')).toBe(false);
      expect(HARDENED_USERNAME_REGEX.test('john.')).toBe(false);
      expect(HARDENED_USERNAME_REGEX.test('_john')).toBe(false);
      expect(HARDENED_USERNAME_REGEX.test('john_')).toBe(false);
      expect(HARDENED_USERNAME_REGEX.test('john..doe')).toBe(false);
      expect(HARDENED_USERNAME_REGEX.test('john__doe')).toBe(false);
      expect(HARDENED_USERNAME_REGEX.test('j')).toBe(false);
      expect(HARDENED_USERNAME_REGEX.test('a'.repeat(33))).toBe(false);
    });
  });

  describe('RESERVED_USERNAMES', () => {
    it('contains common reserved route keywords', () => {
      expect(RESERVED_USERNAMES).toContain('admin');
      expect(RESERVED_USERNAMES).toContain('root');
      expect(RESERVED_USERNAMES).toContain('settings');
      expect(RESERVED_USERNAMES).toContain('messages');
      expect(RESERVED_USERNAMES).toContain('explore');
    });
  });

  describe('loginSchema', () => {
    it('validates with email and password', () => {
      const parsed = loginSchema.parse({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(parsed.email).toBe('user@example.com');
      expect(parsed.password).toBe('password123');
    });

    it('validates with identity and password', () => {
      const parsed = loginSchema.parse({
        identity: 'cool_user',
        password: 'password123',
      });
      expect(parsed.identity).toBe('cool_user');
    });

    it('fails when neither email nor identity is provided', () => {
      expect(() =>
        loginSchema.parse({
          password: 'password123',
        }),
      ).toThrow();
    });

    it('fails when password is too short', () => {
      expect(() =>
        loginSchema.parse({
          email: 'user@example.com',
          password: '123',
        }),
      ).toThrow();
    });
  });

  describe('registerSchema', () => {
    it('normalizes email and username with @ prefix removal and lowercase transformation', () => {
      const parsed = registerSchema.parse({
        email: 'user.test@example.com',
        username: 'Cool_User',
        displayName: 'Cool Person',
        password: 'securePassword123',
      });
      expect(parsed.email).toBe('user.test@example.com');
      expect(parsed.username).toBe('cool_user');
    });

    it('rejects reserved username during registration', () => {
      expect(() =>
        registerSchema.parse({
          email: 'admin@example.com',
          username: 'admin',
          password: 'securePassword123',
        }),
      ).toThrow();
    });
  });

  describe('refreshTokenSchema & changePasswordSchema & checkUsernameSchema', () => {
    it('validates refreshTokenSchema', () => {
      const parsed = refreshTokenSchema.parse({ refreshToken: 'valid-token' });
      expect(parsed.refreshToken).toBe('valid-token');
      expect(() => refreshTokenSchema.parse({ refreshToken: '' })).toThrow();
    });

    it('validates changePasswordSchema length constraints', () => {
      const parsed = changePasswordSchema.parse({
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
      });
      expect(parsed.newPassword).toBe('newPassword123');
      expect(() =>
        changePasswordSchema.parse({
          currentPassword: 'short',
          newPassword: 'newPassword123',
        }),
      ).toThrow();
    });

    it('validates checkUsernameSchema and trims @', () => {
      const parsed = checkUsernameSchema.parse({ username: '@Cool_Hero' });
      expect(parsed.username).toBe('cool_hero');
    });

    it('validates authResponseSchema structure', () => {
      const parsed = authResponseSchema.parse({
        accessToken: 'access-jwt',
        user: {
          id: 'u-1',
          email: 'u@example.com',
          username: 'u1',
        },
      });
      expect(parsed.accessToken).toBe('access-jwt');
      expect(parsed.user.id).toBe('u-1');
    });
  });
});
