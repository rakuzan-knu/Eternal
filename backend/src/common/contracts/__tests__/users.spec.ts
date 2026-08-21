import {
  Visibility,
  AutoDeletePeriod,
  ExceptionMode,
  PrivacyDimension,
  LastSeenGranularity,
  FollowStatusView,
  updateUserSchema,
  deleteAccountSchema,
  setUserAliasSchema,
  updatePrimaryBadgeSchema,
  privacySettingsSchema,
  updatePrivacySchema,
  addPrivacyExceptionSchema,
  userProfileSchema,
  CreateUserDto,
  PrivacyExceptionUserDto,
  DimensionExceptionsDto,
} from '../users';

describe('users contract schemas and DTOs (users.spec.ts)', () => {
  it('should validate and sanitize updateUserSchema', () => {
    const parsed = updateUserSchema.parse({
      email: 'NEW_EMAIL@example.com',
      username: 'alice_w',
      displayName: '<b>Alice</b>',
      bio: '<script>alert(1)</script>Hello',
    });
    expect(parsed.email).toBe('new_email@example.com');
    expect(parsed.username).toBe('alice_w');
    expect(parsed.displayName).toBe('Alice');
    expect(parsed.bio).toBe('Hello');
  });

  it('should validate deleteAccountSchema and setUserAliasSchema', () => {
    expect(deleteAccountSchema.parse({ password: 'secretPassword' }).password).toBe(
      'secretPassword',
    );
    expect(setUserAliasSchema.parse({ alias: 'Best Friend' }).alias).toBe('Best Friend');
    expect(updatePrimaryBadgeSchema.parse({ badgeId: 'badge-1' }).badgeId).toBe('badge-1');
  });

  it('should validate privacySettingsSchema and updatePrivacySchema', () => {
    const settings = privacySettingsSchema.parse({
      lastSeen: Visibility.EVERYBODY,
      avatar: Visibility.CONTACTS,
      banner: Visibility.EVERYBODY,
      forwardLink: Visibility.NOBODY,
      calls: Visibility.CONTACTS,
      voiceMessages: Visibility.EVERYBODY,
      messages: Visibility.EVERYBODY,
      birthday: Visibility.NOBODY,
      bio: Visibility.EVERYBODY,
      groupInvites: Visibility.CONTACTS,
      isPrivate: false,
      autoDeletePeriod: AutoDeletePeriod.OFF,
    });
    expect(settings.lastSeen).toBe(Visibility.EVERYBODY);
    expect(settings.isPrivate).toBe(false);

    const update = updatePrivacySchema.parse({
      isPrivate: true,
      lastSeen: Visibility.NOBODY,
    });
    expect(update.isPrivate).toBe(true);
    expect(update.lastSeen).toBe(Visibility.NOBODY);
  });

  it('should validate addPrivacyExceptionSchema', () => {
    const exception = addPrivacyExceptionSchema.parse({
      dimension: PrivacyDimension.LAST_SEEN,
      targetId: 'target-usr-1',
      mode: ExceptionMode.ALLOW,
    });
    expect(exception.dimension).toBe(PrivacyDimension.LAST_SEEN);
    expect(exception.mode).toBe(ExceptionMode.ALLOW);
  });

  it('should validate userProfileSchema and enum constants', () => {
    const now = new Date();
    const profile = userProfileSchema.parse({
      id: 'usr-1',
      username: 'charlie',
      displayName: 'Charlie',
      avatar: null,
      isPrivate: false,
      isVerified: true,
      createdAt: now,
      updatedAt: now,
      lastSeen: LastSeenGranularity.RECENTLY,
      followStatus: FollowStatusView.FOLLOWING,
    });
    expect(profile.username).toBe('charlie');
    expect(profile.lastSeen).toBe('RECENTLY');
    expect(profile.followStatus).toBe('following');
  });

  it('should instantiate CreateUserDto and exception DTO classes', () => {
    const createDto = new CreateUserDto({
      email: 'dave@example.com',
      username: 'dave',
      passwordHash: 'hash123',
      displayName: 'Dave',
    });
    expect(createDto.email).toBe('dave@example.com');
    expect(createDto.displayName).toBe('Dave');

    const exUser = new PrivacyExceptionUserDto();
    exUser.id = 'u-1';
    exUser.username = 'u1';
    exUser.displayName = 'User One';
    exUser.avatar = null;

    const dimDto = new DimensionExceptionsDto();
    dimDto.allow = [exUser];
    dimDto.deny = [];
    expect(dimDto.allow).toHaveLength(1);
    expect(dimDto.deny).toHaveLength(0);
  });
});
