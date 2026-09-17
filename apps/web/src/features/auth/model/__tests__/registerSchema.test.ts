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

    const invalidPassword = registerSchema.safeParse({
      firstName: 'John',
      lastName: 'Doe',
      username: 'john_doe',
      birthMonth: 'January',
      birthDay: '15',
      birthYear: '1995',
      gender: 'Male',
      identity: 'john@example.com',
      password: 'short',
    });
    expect(invalidPassword.success).toBe(false);
  });

  it('rejects all new public and system reserved usernames', () => {
    const reservedList = [
      'about',
      'download',
      'safety',
      'terms',
      'privacy',
      'blog',
      'creators',
      'careers',
      'brand',
      'newsroom',
      'family-center',
      'teen-charter',
      'wellbeing',
      'law-enforcement',
      'sitemap',
      'eternal',
      'eternalnet',
      'theeternalnet',
    ];

    for (const reserved of reservedList) {
      const res = registerSchema.safeParse({
        firstName: 'Test',
        lastName: 'User',
        username: reserved,
        birthMonth: 'January',
        birthDay: '15',
        birthYear: '1995',
        gender: 'Male',
        identity: `${reserved}@example.com`,
        password: 'password123',
      });
      expect(res.success).toBe(false);
    }
  });
});
