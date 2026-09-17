import { describe, it, expect } from 'vitest';
import { loginSchema } from '../loginSchema';

describe('loginSchema', () => {
  it('validates email identity and password length', () => {
    const valid = loginSchema.safeParse({
      identity: 'test@example.com',
      password: 'password123',
    });
    expect(valid.success).toBe(true);

    const validPhone = loginSchema.safeParse({
      identity: '+12345678901',
      password: 'password123',
    });
    expect(validPhone.success).toBe(true);
  });

  it('fails for invalid email/phone or short password', () => {
    const invalidEmail = loginSchema.safeParse({
      identity: 'invalid-email',
      password: 'password123',
    });
    expect(invalidEmail.success).toBe(false);

    const shortPass = loginSchema.safeParse({
      identity: 'test@example.com',
      password: '123',
    });
    expect(shortPass.success).toBe(false);
  });
});
