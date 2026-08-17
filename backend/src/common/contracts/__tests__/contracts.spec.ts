import {
  AttachmentType,
  AutoDeletePeriod,
  ExceptionMode,
  MediaType,
  MessageType,
  MuteLevel,
  PrivacyDimension,
  ReportCategory,
  Visibility,
} from '@prisma/client';
import {
  HARDENED_USERNAME_REGEX,
  RESERVED_USERNAMES,
  addMembersSchema,
  addPrivacyExceptionSchema,
  attachmentSchema,
  authResponseSchema,
  changePasswordSchema,
  checkUsernameSchema,
  CommentResponseDto,
  conversationIdSchema,
  createCommentSchema,
  createDirectConversationSchema,
  createGroupConversationSchema,
  createPollSchema,
  createPostSchema,
  CreateUserDto,
  deleteAccountSchema,
  deleteMessageSchema,
  editMessageSchema,
  editPostSchema,
  followResponseSchema,
  forwardMessageSchema,
  gatewayResumeSchema,
  getCommentsQuerySchema,
  getFollowersQuerySchema,
  getMessagesQuerySchema,
  getOnlineStatusSchema,
  getPostsQuerySchema,
  healthResponseSchema,
  healthServicesStatusSchema,
  loginSchema,
  markReadSchema,
  mediaSchema,
  muteConversationSchema,
  pingResponseSchema,
  pinMessageSchema,
  pollOptionResponseSchema,
  pollResponseSchema,
  PostMediaResponseDto,
  PostResponseDto,
  privacySettingsSchema,
  promoteMemberSchema,
  reactToMessageSchema,
  refreshTokenSchema,
  registerSchema,
  reportPostSchema,
  reportSchema,
  searchMessagesQuerySchema,
  searchPostsSchema,
  sendMessageSchema,
  sessionViewSchema,
  setNicknameSchema,
  setThemeSchema,
  setUserAliasSchema,
  togglePinMessageSchema,
  transferOwnershipSchema,
  updateGroupConversationSchema,
  updatePrimaryBadgeSchema,
  updatePrivacySchema,
  updateUserSchema,
  userProfileSchema,
} from '../index';

describe('Common Contracts & Zod Schemas', () => {
  describe('Auth contracts', () => {
    it('validates login schema with email or identity', () => {
      const withEmail = loginSchema.parse({ email: 'user@example.com', password: 'Password123!' });
      expect(withEmail.email).toBe('user@example.com');

      const withIdentity = loginSchema.parse({ identity: 'cool_user', password: 'Password123!' });
      expect(withIdentity.identity).toBe('cool_user');

      expect(() => loginSchema.parse({ password: 'Password123!' })).toThrow();
      expect(() => loginSchema.parse({ email: 'invalid', password: 'short' })).toThrow();
    });

    it('validates register schema with username constraints and sanitation', () => {
      const valid = registerSchema.parse({
        email: 'Alice@EXAMPLE.COM',
        username: 'alice_01',
        password: 'Password123!',
      });
      expect(valid.email).toBe('alice@example.com');
      expect(valid.username).toBe('alice_01');

      // Reserved username rejection
      expect(() =>
        registerSchema.parse({
          email: 'test@example.com',
          username: 'admin',
          password: 'Password123!',
        }),
      ).toThrow();

      // Invalid username characters
      expect(() =>
        registerSchema.parse({
          email: 'test@example.com',
          username: '_invalid_start',
          password: 'Password123!',
        }),
      ).toThrow();
    });

    it('verifies HARDENED_USERNAME_REGEX and RESERVED_USERNAMES', () => {
      expect(HARDENED_USERNAME_REGEX.test('valid.user_1')).toBe(true);
      expect(HARDENED_USERNAME_REGEX.test('.invalid')).toBe(false);
      expect(HARDENED_USERNAME_REGEX.test('invalid.')).toBe(false);
      expect(HARDENED_USERNAME_REGEX.test('invalid..user')).toBe(false);
      expect(RESERVED_USERNAMES.includes('settings')).toBe(true);
    });

    it('validates refreshTokenSchema and changePasswordSchema', () => {
      expect(refreshTokenSchema.parse({ refreshToken: 'token-xyz' })).toEqual({
        refreshToken: 'token-xyz',
      });
      expect(() => refreshTokenSchema.parse({ refreshToken: '' })).toThrow();

      const pwd = changePasswordSchema.parse({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      });
      expect(pwd.newPassword).toBe('NewPassword456!');
    });

    it('validates checkUsernameSchema and authResponseSchema', () => {
      expect(checkUsernameSchema.parse({ username: '@CoolUser ' })).toEqual({
        username: 'cooluser',
      });

      const authRes = authResponseSchema.parse({
        accessToken: 'jwt.token.here',
        user: {
          id: 'usr-1',
          email: 'a@b.com',
          username: 'ab',
        },
      });
      expect(authRes.user.id).toBe('usr-1');
    });
  });

  describe('Users contracts', () => {
    it('validates updateUserSchema with HTML stripping', () => {
      const updated = updateUserSchema.parse({
        displayName: '<b>Bold Name</b>',
        bio: '<script>alert("hack")</script>Bio text',
        bannerPosition: '75',
      });
      expect(updated.displayName).toBe('Bold Name');
      expect(updated.bio).toBe('Bio text');
      expect(updated.bannerPosition).toBe(75);
    });

    it('validates privacySettingsSchema and updatePrivacySchema', () => {
      const fullPrivacy = privacySettingsSchema.parse({
        lastSeen: Visibility.EVERYBODY,
        avatar: Visibility.CONTACTS,
        banner: Visibility.EVERYBODY,
        forwardLink: Visibility.NOBODY,
        calls: Visibility.EVERYBODY,
        voiceMessages: Visibility.EVERYBODY,
        messages: Visibility.EVERYBODY,
        birthday: Visibility.NOBODY,
        bio: Visibility.EVERYBODY,
        groupInvites: Visibility.EVERYBODY,
        isPrivate: false,
        autoDeletePeriod: AutoDeletePeriod.OFF,
      });
      expect(fullPrivacy.avatar).toBe(Visibility.CONTACTS);

      const partialPrivacy = updatePrivacySchema.parse({
        avatar: Visibility.NOBODY,
      });
      expect(partialPrivacy.avatar).toBe(Visibility.NOBODY);
    });

    it('validates addPrivacyExceptionSchema and userProfileSchema', () => {
      const exception = addPrivacyExceptionSchema.parse({
        dimension: PrivacyDimension.AVATAR,
        targetId: 'target-user-123',
        mode: ExceptionMode.DENY,
      });
      expect(exception.dimension).toBe(PrivacyDimension.AVATAR);

      const profile = userProfileSchema.parse({
        id: 'usr-1',
        username: 'usr1',
        displayName: null,
        avatar: null,
        bio: null,
        isPrivate: false,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(profile.isVerified).toBe(true);
    });

    it('instantiates CreateUserDto properly', () => {
      const dto = new CreateUserDto({
        email: 'user@test.com',
        username: 'testuser',
        passwordHash: 'argon2-hash',
        displayName: 'Test',
      });
      expect(dto.email).toBe('user@test.com');
      expect(dto.displayName).toBe('Test');
    });

    it('validates deleteAccountSchema, setUserAliasSchema, updatePrimaryBadgeSchema', () => {
      expect(deleteAccountSchema.parse({ password: 'my-password' })).toEqual({
        password: 'my-password',
      });
      expect(setUserAliasSchema.parse({ alias: 'Best Friend' })).toEqual({
        alias: 'Best Friend',
      });
      expect(updatePrimaryBadgeSchema.parse({ badgeId: 'badge-vip' })).toEqual({
        badgeId: 'badge-vip',
      });
    });
  });

  describe('Posts contracts', () => {
    it('validates createPostSchema and preprocessing for media, gifs, and polls', () => {
      expect(
        mediaSchema.parse({ type: MediaType.IMAGE, url: 'https://example.com/img.png' }),
      ).toEqual({
        type: MediaType.IMAGE,
        url: 'https://example.com/img.png',
      });

      const parsed = createPostSchema.parse({
        content: ' Hello World! ',
        media: JSON.stringify([{ type: MediaType.IMAGE, url: 'https://example.com/img.png' }]),
        gifUrls: JSON.stringify(['https://example.com/a.gif']),
        poll: JSON.stringify(['Option 1', 'Option 2']),
      });

      expect(parsed.content).toBe('Hello World!');
      expect(parsed.media).toHaveLength(1);
      expect(parsed.gifUrls).toEqual(['https://example.com/a.gif']);
      expect(parsed.poll).toEqual(['Option 1', 'Option 2']);
    });

    it('validates editPostSchema, getPostsQuerySchema, searchPostsSchema, reportPostSchema', () => {
      expect(editPostSchema.parse({ content: ' Updated ' })).toEqual({ content: 'Updated' });
      expect(getPostsQuerySchema.parse({ limit: '50' })).toEqual({ limit: 50 });
      expect(searchPostsSchema.parse({ q: 'query', mediaOnly: 'true' })).toEqual({
        q: 'query',
        limit: 20,
        mediaOnly: true,
      });
      expect(
        reportPostSchema.parse({ category: ReportCategory.SPAM, details: 'Spammy post' }),
      ).toEqual({
        category: ReportCategory.SPAM,
        details: 'Spammy post',
      });
    });

    it('maps PostMedia and PostWithRelations correctly via DTO fromPrisma static helpers', () => {
      const mediaDto = PostMediaResponseDto.fromPrisma({
        id: 'media-1',
        postId: 'post-1',
        type: MediaType.IMAGE,
        url: 'https://img.com/1.png',
        poster: null,
        order: 0,
        createdAt: new Date(),
      });
      expect(mediaDto.id).toBe('media-1');
      expect(mediaDto.type).toBe(MediaType.IMAGE);

      const postDate = new Date('2026-08-16T12:00:00.000Z');
      const postDto = PostResponseDto.fromPrisma({
        id: 'post-100',
        content: 'Post text',
        sharesCount: 5,
        authorId: 'auth-1',
        author: {
          id: 'auth-1',
          username: 'author_user',
          displayName: 'Author User',
          avatar: 'https://avatar.com/1.png',
          isVerified: true,
          primaryBadge: 'verified',
        },
        createdAt: postDate,
        updatedAt: postDate,
        media: [],
        poll: {
          id: 'poll-1',
          title: 'Poll Title',
          description: null,
          isMultiple: false,
          isActive: true,
          options: [{ id: 'opt-1', optionText: 'Choice A', votesCount: 10 }],
          votes: [{ optionId: 'opt-1' }],
        },
        _count: {
          likes: 20,
          reposts: 3,
          comments: 7,
        },
      });

      expect(postDto.id).toBe('post-100');
      expect(postDto.author).toBe('Author User');
      expect(postDto.handle).toBe('author_user');
      expect(postDto.likesCount).toBe(20);
      expect(postDto.poll?.totalVotes).toBe(10);
      expect(postDto.poll?.myVoteOptionId).toBe('opt-1');
    });
  });

  describe('Chat contracts', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('validates conversationIdSchema and attachmentSchema', () => {
      expect(conversationIdSchema.parse({ conversationId: validUuid })).toEqual({
        conversationId: validUuid,
      });

      const att = attachmentSchema.parse({
        type: AttachmentType.IMAGE,
        url: 'https://files.com/photo.png',
        size: 1024,
      });
      expect(att.type).toBe(AttachmentType.IMAGE);
    });

    it('validates sendMessageSchema refinement (text or attachments required)', () => {
      expect(
        sendMessageSchema.parse({
          conversationId: validUuid,
          text: 'Hello!',
          messageType: MessageType.TEXT,
        }),
      ).toBeDefined();

      expect(
        sendMessageSchema.parse({
          conversationId: validUuid,
          attachments: [{ type: AttachmentType.FILE, url: 'https://files.com/doc.pdf' }],
        }),
      ).toBeDefined();

      expect(() =>
        sendMessageSchema.parse({
          conversationId: validUuid,
          text: '   ',
        }),
      ).toThrow();
    });

    it('validates chat action schemas', () => {
      expect(gatewayResumeSchema.parse({ sessionId: 'sess-1', lastSeq: 42 })).toEqual({
        sessionId: 'sess-1',
        lastSeq: 42,
      });
      expect(
        editMessageSchema.parse({ messageId: validUuid, body: 'Edited message' }),
      ).toBeDefined();
      expect(deleteMessageSchema.parse({ messageId: validUuid, forAll: 'true' })).toEqual({
        messageId: validUuid,
        forAll: true,
      });
      expect(
        forwardMessageSchema.parse({ messageId: validUuid, conversationIds: [validUuid] }),
      ).toBeDefined();
      expect(reactToMessageSchema.parse({ messageId: validUuid, emoji: '🔥' })).toBeDefined();
      expect(pinMessageSchema.parse({ messageId: validUuid })).toBeDefined();
      expect(
        togglePinMessageSchema.parse({ conversationId: validUuid, messageId: validUuid }),
      ).toBeDefined();
      expect(markReadSchema.parse({ conversationId: validUuid })).toBeDefined();
      expect(getOnlineStatusSchema.parse({ userIds: [validUuid] })).toBeDefined();
      expect(getMessagesQuerySchema.parse({ limit: '30' })).toEqual({ limit: 30 });
      expect(searchMessagesQuerySchema.parse({ q: 'needle' })).toEqual({ q: 'needle', limit: 30 });
      expect(reportSchema.parse({ category: 'harassment' })).toEqual({ category: 'harassment' });
      expect(createDirectConversationSchema.parse({ participantId: 'usr-target' })).toBeDefined();
      expect(
        createGroupConversationSchema.parse({ name: 'Group Alpha', memberIds: [validUuid] }),
      ).toBeDefined();
      expect(updateGroupConversationSchema.parse({ name: 'New Group Name' })).toBeDefined();
      expect(setNicknameSchema.parse({ targetUserId: validUuid, nickname: 'Buddy' })).toBeDefined();
      expect(setThemeSchema.parse({ theme: 'dark-violet' })).toBeDefined();
      expect(muteConversationSchema.parse({ muteLevel: MuteLevel.MESSAGES })).toBeDefined();
      expect(addMembersSchema.parse({ memberIds: [validUuid] })).toBeDefined();
      expect(transferOwnershipSchema.parse({ newOwnerId: validUuid })).toBeDefined();
      expect(promoteMemberSchema.parse({ userId: validUuid })).toBeDefined();
    });
  });

  describe('Comments, Followers, Poll, Health, Sessions contracts', () => {
    it('validates comments contracts and CommentResponseDto.fromPrisma', () => {
      expect(createCommentSchema.parse({ text: '  Nice post!  ' })).toEqual({ text: 'Nice post!' });
      expect(getCommentsQuerySchema.parse({ limit: '15' })).toEqual({ limit: 15 });

      const commentDto = CommentResponseDto.fromPrisma({
        id: 'comment-1',
        text: 'Great photo',
        postId: 'post-1',
        userId: 'user-1',
        parentId: null,
        createdAt: new Date('2026-08-16T12:00:00.000Z'),
        user: {
          id: 'user-1',
          username: 'photographer',
          displayName: 'Photo Pro',
          avatar: null,
          isVerified: false,
          primaryBadge: null,
        },
      });

      expect(commentDto.author).toBe('Photo Pro');
      expect(commentDto.handle).toBe('photographer');
      expect(commentDto.text).toBe('Great photo');
    });

    it('validates followers contracts', () => {
      expect(getFollowersQuerySchema.parse({ limit: '10' })).toEqual({ limit: 10 });
      expect(followResponseSchema.parse({ success: true, status: 'following' })).toEqual({
        success: true,
        status: 'following',
      });
    });

    it('validates poll contracts', () => {
      const poll = createPollSchema.parse({
        postId: 'post-1',
        title: 'Favorite framework?',
        options: ['React', 'Vue', 'Angular'],
      });
      expect(poll.options).toHaveLength(3);

      const optionRes = pollOptionResponseSchema.parse({
        id: 'opt-1',
        optionText: 'React',
        votesCount: 42,
      });
      expect(optionRes.votesCount).toBe(42);

      const pollRes = pollResponseSchema.parse({
        id: 'poll-1',
        postId: 'post-1',
        title: 'Favorite framework?',
        isMultiple: false,
        isActive: true,
        options: [optionRes],
        totalVotes: 42,
      });
      expect(pollRes.totalVotes).toBe(42);
    });

    it('validates health & ping contracts', () => {
      const status = healthServicesStatusSchema.parse({ database: 'ok', redis: 'ok' });
      expect(status.database).toBe('ok');

      const health = healthResponseSchema.parse({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: 1234.56,
        services: { database: 'ok', redis: 'ok' },
      });
      expect(health.status).toBe('ok');

      const ping = pingResponseSchema.parse({
        status: 'pong',
        timestamp: new Date().toISOString(),
      });
      expect(ping.status).toBe('pong');
    });

    it('validates sessions contract', () => {
      const now = new Date();
      const session = sessionViewSchema.parse({
        id: 'sess-1',
        deviceName: 'Chrome / macOS',
        ip: '127.0.0.1',
        city: 'San Francisco',
        country: 'US',
        createdAt: now,
        lastActiveAt: now,
        isCurrent: true,
      });
      expect(session.isCurrent).toBe(true);
      expect(session.city).toBe('San Francisco');
    });
  });
});
