import * as Contracts from '../index';

describe('contracts barrel exports (index.spec.ts)', () => {
  it('should re-export all sub-contract modules correctly', () => {
    expect(Contracts.loginSchema).toBeDefined();
    expect(Contracts.registerSchema).toBeDefined();
    expect(Contracts.updateUserSchema).toBeDefined();
    expect(Contracts.createPostSchema).toBeDefined();
    expect(Contracts.sendMessageSchema).toBeDefined();
    expect(Contracts.createCommentSchema).toBeDefined();
    expect(Contracts.getFollowersQuerySchema).toBeDefined();
    expect(Contracts.createPollSchema).toBeDefined();
    expect(Contracts.healthResponseSchema).toBeDefined();
    expect(Contracts.sessionViewSchema).toBeDefined();
  });
});
