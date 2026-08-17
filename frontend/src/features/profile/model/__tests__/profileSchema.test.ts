import { describe, it, expect } from 'vitest';
import { profileSchema } from '../profileSchema';

describe('profileSchema', () => {
  it('validates a valid profile payload', () => {
    const validData = {
      displayName: 'Alex Smith',
      username: 'alex_smith',
      bio: 'Software engineer and open-source enthusiast',
      onlineStatus: true,
      notifMain: true,
      notifSound: false,
    };

    const result = profileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects usernames that are reserved words', () => {
    const data = {
      displayName: 'Admin User',
      username: 'admin',
      bio: '',
      onlineStatus: true,
      notifMain: true,
      notifSound: true,
    };

    const result = profileSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('reserved');
    }
  });

  it('rejects usernames with consecutive special characters or starting/ending with dot/underscore', () => {
    const invalidUsernames = ['.alex', 'alex.', '_alex', 'alex_', 'alex..smith', 'alex__smith'];

    for (const username of invalidUsernames) {
      const result = profileSchema.safeParse({
        displayName: 'Test',
        username,
        bio: '',
        onlineStatus: true,
        notifMain: true,
        notifSound: true,
      });
      expect(result.success).toBe(false);
    }
  });

  it('rejects bio exceeding 200 characters', () => {
    const result = profileSchema.safeParse({
      displayName: 'Test',
      username: 'valid_user',
      bio: 'a'.repeat(201),
      onlineStatus: true,
      notifMain: true,
      notifSound: true,
    });
    expect(result.success).toBe(false);
  });
});
