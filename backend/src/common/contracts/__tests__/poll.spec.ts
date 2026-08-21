import { createPollSchema, pollResponseSchema } from '../poll';

describe('poll contract schemas (poll.spec.ts)', () => {
  it('should validate createPollSchema with valid options', () => {
    const parsed = createPollSchema.parse({
      postId: 'post-123',
      title: 'Favorite framework?',
      options: ['NestJS', 'Next.js', 'Express'],
      isMultiple: false,
    });
    expect(parsed.postId).toBe('post-123');
    expect(parsed.options).toHaveLength(3);
  });

  it('should fail createPollSchema when fewer than 2 options are provided', () => {
    expect(() =>
      createPollSchema.parse({
        postId: 'post-123',
        title: 'Invalid poll',
        options: ['Only one option'],
      }),
    ).toThrow();
  });

  it('should validate pollResponseSchema', () => {
    const valid = pollResponseSchema.parse({
      id: 'poll-1',
      postId: 'post-123',
      title: 'Poll Title',
      isMultiple: true,
      isActive: true,
      options: [
        { id: 'opt-1', optionText: 'Option 1', votesCount: 5 },
        { id: 'opt-2', optionText: 'Option 2', votesCount: 10 },
      ],
      totalVotes: 15,
      userVotedOptionIds: ['opt-1'],
    });
    expect(valid.id).toBe('poll-1');
    expect(valid.totalVotes).toBe(15);
    expect(valid.userVotedOptionIds).toEqual(['opt-1']);
  });
});
