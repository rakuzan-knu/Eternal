import { describe, it, expect } from 'vitest';
import { loginSchema } from '../loginSchema';
import { registerSchema } from '../registerSchema';

describe('Auth Model Types & Schemas', () => {
  it('validates login schema correctly', () => {
    const valid = loginSchema.safeParse({
      identity: 'user@example.com',
      password: 'password123',
    });
    expect(valid.success).toBe(true);

    const invalid = loginSchema.safeParse({
      identity: '',
      password: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates register schema correctly', () => {
    const valid = registerSchema.safeParse({
      firstName: 'Alice',
      lastName: 'Smith',
      username: 'alicesmith',
      identity: 'alice@example.com',
      password: 'StrongPassword123!',
      birthDay: '15',
      birthMonth: 'May',
      birthYear: '2000',
      gender: 'Female',
    });
    expect(valid.success).toBe(true);
  });
});
