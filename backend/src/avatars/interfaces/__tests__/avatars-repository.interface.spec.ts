import {
  AVATAR_REPOSITORY,
  type AvatarView,
  type IAvatarRepository,
} from '../avatars-repository.interface';

describe('avatars-repository.interface', () => {
  it('defines unique AVATAR_REPOSITORY symbol token', () => {
    expect(typeof AVATAR_REPOSITORY).toBe('symbol');
    expect(AVATAR_REPOSITORY.toString()).toBe('Symbol(AVATAR_REPOSITORY)');
  });

  it('implements IAvatarRepository shape properly', async () => {
    const mockRepo: IAvatarRepository = {
      findById: jest.fn().mockResolvedValue({ id: 'usr-1', avatar: 'https://img.com/1.png' }),
      updateAvatar: jest.fn().mockResolvedValue({ id: 'usr-1', avatar: null }),
    };

    const avatar: AvatarView | null = await mockRepo.findById('usr-1');
    expect(avatar?.avatar).toBe('https://img.com/1.png');

    const updated = await mockRepo.updateAvatar('usr-1', null);
    expect(updated.avatar).toBeNull();
  });
});
