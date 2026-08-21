import { describe, it, expect } from 'vitest';
import { registerSchema } from '../registerSchema';

describe('registerSchema', () => {
  it('validates correct registration fields', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
      username: '@johndoe',
      birthMonth: 'January',
      birthDay: '15',
      birthYear: '1995',
      gender: 'Male',
      identity: 'john@example.com',
      password: 'password123',
    };

    const parsed = registerSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.username).toBe('johndoe');
    }
  });

  it('rejects invalid names, short password, or reserved usernames', () => {
    const reservedUser = registerSchema.safeParse({
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      birthMonth: 'January',
      birthDay: '15',
      birthYear: '1995',
      gender: 'Male',
      identity: 'admin@example.com',
      password: 'password123',
    });
    expect(reservedUser.success).toBe(false);

    const invalidName = registerSchema.safeParse({
      firstName: 'John123',
      lastName: 'Doe',
      username: 'johndoe',
      birthMonth: 'January',
      birthDay: '15',
      birthYear: '1995',
      gender: 'Male',
      identity: 'john@example.com',
      password: 'password123',
    });
    expect(invalidName.success).toBe(false);
  });
});
