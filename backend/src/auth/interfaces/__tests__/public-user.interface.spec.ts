import type { PublicUser } from '../public-user.interface';

describe('public-user.interface', () => {
  it('should correctly type PublicUser with string displayName', () => {
    const user: PublicUser = {
      id: 'usr-123',
      email: 'user@example.com',
      username: 'username123',
      displayName: 'User Name',
    };

    expect(user.id).toBe('usr-123');
    expect(user.email).toBe('user@example.com');
    expect(user.username).toBe('username123');
    expect(user.displayName).toBe('User Name');
  });

  it('should correctly type PublicUser with null displayName', () => {
    const user: PublicUser = {
      id: 'usr-456',
      email: 'user2@example.com',
      username: 'username456',
      displayName: null,
    };

    expect(user.id).toBe('usr-456');
    expect(user.displayName).toBeNull();
  });
});
