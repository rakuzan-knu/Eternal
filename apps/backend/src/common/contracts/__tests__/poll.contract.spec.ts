import { createPollSchema, pollOptionResponseSchema, pollResponseSchema } from '../poll';

describe('poll.contract', () => {
  it('validates createPollSchema with minimum 2 options', () => {
    const valid = createPollSchema.parse({
      postId: 'post-1',
      title: 'Best runtime?',
      description: 'Choose your preferred TS runtime',
      isMultiple: true,
      options: ['Node.js', 'Bun', 'Deno'],
    });

    expect(valid.options).toHaveLength(3);
    expect(valid.isMultiple).toBe(true);

    // Fails with only 1 option
    expect(() =>
      createPollSchema.parse({
        postId: 'post-1',
        title: 'Only one option',
        options: ['Only this'],
      }),
    ).toThrow();
  });

  it('validates pollOptionResponseSchema and pollResponseSchema', () => {
    const option1 = pollOptionResponseSchema.parse({
      id: 'opt-1',
      optionText: 'Node.js',
      votesCount: 15,
    });
    const option2 = pollOptionResponseSchema.parse({
      id: 'opt-2',
      optionText: 'Bun',
      votesCount: 25,
    });

    const poll = pollResponseSchema.parse({
      id: 'poll-123',
      postId: 'post-1',
      title: 'Best runtime?',
      description: null,
      isMultiple: false,
      isActive: true,
      options: [option1, option2],
      totalVotes: 40,
      userVotedOptionIds: ['opt-2'],
    });

    expect(poll.totalVotes).toBe(40);
    expect(poll.options[1].optionText).toBe('Bun');
    expect(poll.userVotedOptionIds).toEqual(['opt-2']);
  });
});
