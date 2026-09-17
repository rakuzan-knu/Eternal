import * as Contracts from '../index';

describe('contracts index barrel exports', () => {
  it('exports auth, users, posts, chat, comments, followers, poll, health, sessions members', () => {
    // Auth
    expect(Contracts.loginSchema).toBeDefined();
    expect(Contracts.registerSchema).toBeDefined();
    expect(Contracts.HARDENED_USERNAME_REGEX).toBeDefined();

    // Users
    expect(Contracts.updateUserSchema).toBeDefined();
    expect(Contracts.userProfileSchema).toBeDefined();
    expect(Contracts.CreateUserDto).toBeDefined();

    // Posts
    expect(Contracts.createPostSchema).toBeDefined();
    expect(Contracts.PostResponseDto).toBeDefined();
    expect(Contracts.PostMediaResponseDto).toBeDefined();

    // Chat
    expect(Contracts.sendMessageSchema).toBeDefined();
    expect(Contracts.conversationIdSchema).toBeDefined();

    // Comments
    expect(Contracts.createCommentSchema).toBeDefined();
    expect(Contracts.CommentResponseDto).toBeDefined();

    // Followers
    expect(Contracts.getFollowersQuerySchema).toBeDefined();
    expect(Contracts.followResponseSchema).toBeDefined();

    // Poll
    expect(Contracts.createPollSchema).toBeDefined();
    expect(Contracts.pollResponseSchema).toBeDefined();

    // Health
    expect(Contracts.healthResponseSchema).toBeDefined();
    expect(Contracts.HealthResponseDto).toBeDefined();

    // Sessions
    expect(Contracts.sessionViewSchema).toBeDefined();
  });
});
