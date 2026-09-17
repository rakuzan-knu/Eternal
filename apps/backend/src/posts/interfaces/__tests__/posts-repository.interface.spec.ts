import { POSTS_REPOSITORY, type IPostRepository } from '../posts-repository.interface';
import { ReportCategory } from '@prisma/client';

describe('posts-repository.interface', () => {
  it('defines POSTS_REPOSITORY symbol token', () => {
    expect(typeof POSTS_REPOSITORY).toBe('symbol');
    expect(POSTS_REPOSITORY.toString()).toBe('Symbol(POSTS_REPOSITORY)');
  });

  it('implements IPostRepository interface methods', async () => {
    const incShareMock = jest.fn().mockResolvedValue(undefined);

    const mockRepo: IPostRepository = {
      createPost: jest.fn().mockResolvedValue({ id: 'post-1' }),
      getAllPosts: jest.fn().mockResolvedValue([]),
      getPostById: jest.fn().mockResolvedValue(null),
      getPostsByUserId: jest.fn().mockResolvedValue([]),
      getRepostsByUserId: jest.fn().mockResolvedValue([]),
      getSavedPostsByUserId: jest.fn().mockResolvedValue([]),
      getExploreMediaPosts: jest.fn().mockResolvedValue([]),
      getPostsByHashtag: jest.fn().mockResolvedValue({ posts: [], totalCount: 0 }),
      searchPosts: jest.fn().mockResolvedValue([]),
      editPost: jest.fn().mockResolvedValue({ id: 'post-1' }),
      deletePost: jest.fn().mockResolvedValue({ id: 'post-1' }),
      savePost: jest.fn().mockResolvedValue(undefined),
      unsavePost: jest.fn().mockResolvedValue(undefined),
      repost: jest.fn().mockResolvedValue(undefined),
      unrepost: jest.fn().mockResolvedValue(undefined),
      incrementShareCount: incShareMock,
      incrementManyShareCounts: jest.fn().mockResolvedValue(undefined),
      reportPost: jest.fn().mockResolvedValue({ id: 'rep-1' }),
      createPollForPost: jest.fn().mockResolvedValue(undefined),
      findMentionUsers: jest.fn().mockResolvedValue([]),
      findUserBasic: jest.fn().mockResolvedValue(null),
      getPollForVote: jest.fn().mockResolvedValue(null),
      updateVote: jest.fn().mockResolvedValue(undefined),
      createVote: jest.fn().mockResolvedValue(undefined),
      getPollVoters: jest.fn().mockResolvedValue(null),
    };

    expect(await mockRepo.reportPost('post-1', 'usr-1', ReportCategory.SPAM, 'Spam post')).toEqual({
      id: 'rep-1',
    });
    await mockRepo.incrementShareCount('post-1');
    expect(incShareMock).toHaveBeenCalledWith('post-1');
  });
});
