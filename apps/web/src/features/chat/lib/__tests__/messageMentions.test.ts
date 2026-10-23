import { describe, expect, it } from 'vitest';
import { resolveMessageMentions } from '../messageMentions';

const participant = (userId: string, username: string) => ({
  userId,
  user: { id: userId, username, displayName: null, avatar: null },
});
const participants = [
  participant('alice-id', 'alice'),
  participant('dot-id', 'alice.other'),
  participant('me', 'my_name'),
];

describe('typed mentions', () => {
  it('resolves exact known usernames case-insensitively and deduplicates IDs', () => {
    expect(
      resolveMessageMentions('Hi @ALICE, @alice and @alice.other.', participants, 'me'),
    ).toEqual(['alice-id', 'dot-id']);
    expect(resolveMessageMentions('@unknown @everyone @here @my_name', participants, 'me')).toEqual(
      [],
    );
  });

  it('does not match email, a prefix of another username, escaped @ or Unicode token suffixes', () => {
    expect(
      resolveMessageMentions(
        'email@alice @@alice @alice_unknown @alice.other2 @aliceй й@alice @alice..other',
        participants,
        'me',
      ),
    ).toEqual([]);
    expect(resolveMessageMentions('(@alice) / @alice!', participants, 'me')).toEqual(['alice-id']);
  });

  it('uses only this conversation and caps metadata at 50 recipients', () => {
    expect(resolveMessageMentions('@alice', [], 'me')).toEqual([]);
    const many = Array.from({ length: 51 }, (_, i) => participant(`id-${i}`, `user${i}`));
    expect(
      resolveMessageMentions(many.map((p) => `@${p.user.username}`).join(' '), many, 'me'),
    ).toHaveLength(50);
  });
});
