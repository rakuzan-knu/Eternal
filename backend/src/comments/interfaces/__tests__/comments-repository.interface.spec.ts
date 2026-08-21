import { COMMENTS_REPOSITORY, type ICommentsRepository } from '../comments-repository.interface';
import type { CommentWithUser } from '@common/contracts';

describe('comments-repository.interface', () => {
  it('defines COMMENTS_REPOSITORY symbol token', () => {
    expect(typeof COMMENTS_REPOSITORY).toBe('symbol');
    expect(COMMENTS_REPOSITORY.toString()).toBe('Symbol(COMMENTS_REPOSITORY)');
  });

  it('implements ICommentsRepository interface', async () => {
    const mockComment: CommentWithUser = {
      id: 'comm-1',
      postId: 'post-1',
      userId: 'usr-1',
      text: 'Hello',
      parentId: null,
      rootParentId: null,
      replyToUserId: null,
      mediaUrl: null,
      isPinned: false,
      isDeleted: false,
      createdAt: new Date(),
    };

    const mockRepo: ICommentsRepository = {
      addComment: jest.fn().mockResolvedValue(mockComment),
      deleteComment: jest.fn().mockResolvedValue(mockComment),
      getCommentsByPostId: jest.fn().mockResolvedValue([mockComment]),
      getRepliesByRootId: jest.fn().mockResolvedValue([]),
      toggleCommentLike: jest.fn().mockResolvedValue({ isLiked: true, likesCount: 1 }),
      togglePinComment: jest.fn().mockResolvedValue({ isPinned: true }),
    };

    expect(await mockRepo.addComment('post-1', 'usr-1', { text: 'Hello' })).toEqual(mockComment);
    expect(await mockRepo.toggleCommentLike('comm-1', 'usr-1')).toEqual({
      isLiked: true,
      likesCount: 1,
    });
  });
});
