import { describe, it, expect } from 'vitest';
import { registerSchema } from '../registerSchema';

describe('registerSchema', () => {
  const validFields = {
    firstName: 'John',
    lastName: 'Doe',
    username: '@johndoe',
    birthMonth: 'January',
    birthDay: '15',
    birthYear: '1995',
    gender: 'Male',
    identity: 'john@example.com',
  };

  it.each([
    { birthMonth: 'February', birthDay: '30', birthYear: '2000' },
    { birthMonth: 'February', birthDay: '29', birthYear: '2001' },
    { birthMonth: 'April', birthDay: '31', birthYear: '2000' },
    { birthMonth: 'January', birthDay: '1', birthYear: String(new Date().getFullYear() + 1) },
  ])('rejects impossible or future birthdays: $birthYear-$birthMonth-$birthDay', (birthday) => {
    expect(
      registerSchema.safeParse({
        ...validFields,
        ...birthday,
        password: 'password123',
        confirmPassword: 'password123',
      }).success,
    ).toBe(false);
  });

  it('accepts a real leap-day birthday', () => {
    expect(
      registerSchema.safeParse({
        ...validFields,
        birthMonth: 'February',
        birthDay: '29',
        birthYear: '2000',
        password: 'password123',
        confirmPassword: 'password123',
      }).success,
    ).toBe(true);
  });

  it.each([8, 128])('accepts matching passwords of %i characters, like mobile', (length) => {
    const password = 'a'.repeat(length);
    expect(
      registerSchema.safeParse({ ...validFields, password, confirmPassword: password }).success,
    ).toBe(true);
  });

  it.each(['', 'short', 'a'.repeat(129)])('rejects invalid password length', (password) => {
    const result = registerSchema.safeParse({
      ...validFields,
      password,
      confirmPassword: password,
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.some((issue) => issue.path[0] === 'password')).toBe(true);
  });

  it.each(['', 'different-password'])('requires matching confirmation', (confirmPassword) => {
    const result = registerSchema.safeParse({
      ...validFields,
      password: 'password123',
      confirmPassword,
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.some((issue) => issue.path[0] === 'confirmPassword')).toBe(true);
  });

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
      confirmPassword: 'password123',
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
      confirmPassword: 'password123',
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
      confirmPassword: 'short',
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
        confirmPassword: 'password123',
      });
      expect(res.success).toBe(false);
    }
  });
});
