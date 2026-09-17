import {
  MediaType,
  ReportCategory,
  mediaSchema,
  createPostSchema,
  editPostSchema,
  getPostsQuerySchema,
  searchPostsSchema,
  reportPostSchema,
  PostResponseDto,
  type PostWithRelations,
} from '../posts';

describe('posts contract schemas and DTOs (posts.spec.ts)', () => {
  it('should validate mediaSchema', () => {
    const valid = mediaSchema.parse({
      type: MediaType.IMAGE,
      url: 'https://cdn.example.com/photo.png',
      order: 1,
    });
    expect(valid.type).toBe(MediaType.IMAGE);
    expect(valid.url).toBe('https://cdn.example.com/photo.png');
  });

  it('should preprocess and parse createPostSchema with string JSON media and gifUrls', () => {
    const parsed = createPostSchema.parse({
      content: '  Post text with media  ',
      media: JSON.stringify([{ type: MediaType.IMAGE, url: 'https://cdn.example.com/img.jpg' }]),
      gifUrls: JSON.stringify(['https://giphy.com/gif-1']),
    });
    expect(parsed.content).toBe('Post text with media');
    expect(parsed.media).toHaveLength(1);
    expect(parsed.gifUrls).toEqual(['https://giphy.com/gif-1']);
  });

  it('should validate editPostSchema, searchPostsSchema, and reportPostSchema', () => {
    expect(editPostSchema.parse({ content: ' Updated ' }).content).toBe('Updated');
    expect(searchPostsSchema.parse({ q: 'query', mediaOnly: 'true' }).mediaOnly).toBe(true);
    expect(getPostsQuerySchema.parse({ limit: 10 }).limit).toBe(10);
    expect(
      reportPostSchema.parse({ category: ReportCategory.SPAM, details: 'spammy' }).category,
    ).toBe(ReportCategory.SPAM);
  });

  it('should convert PostWithRelations to PostResponseDto with fromPrisma', () => {
    const rawPost: PostWithRelations = {
      id: 'p-1',
      content: 'Hello Antigravity!',
      authorId: 'usr-1',
      author: {
        id: 'usr-1',
        username: 'bob',
        displayName: 'Bob The Dev',
        avatar: 'https://cdn.example.com/bob.png',
        isVerified: true,
        primaryBadge: 'gold',
      },
      createdAt: new Date('2026-08-01T10:00:00Z'),
      updatedAt: new Date('2026-08-01T11:00:00Z'),
      media: [
        {
          id: 'm-1',
          type: MediaType.IMAGE,
          url: 'https://cdn.example.com/m.jpg',
          poster: null,
          order: 0,
          postId: 'p-1',
          createdAt: new Date(),
        },
      ],
      poll: {
        id: 'poll-1',
        title: 'Choose one',
        isMultiple: false,
        isActive: true,
        options: [{ id: 'opt-1', optionText: 'TypeScript', votesCount: 10 }],
        votes: [{ optionId: 'opt-1' }],
      },
      sharesCount: 3,
      _count: {
        likes: 12,
        reposts: 4,
        comments: 8,
      },
      isLiked: true,
      isSaved: true,
      isFollowing: false,
      isReposted: false,
      isOwner: true,
      isPinned: true,
      pinnedAt: new Date('2026-08-01T10:00:00Z'),
    };

    const dto = PostResponseDto.fromPrisma(rawPost);
    expect(dto.id).toBe('p-1');
    expect(dto.author).toBe('Bob The Dev');
    expect(dto.handle).toBe('bob');
    expect(dto.media).toHaveLength(1);
    expect(dto.poll?.totalVotes).toBe(10);
    expect(dto.poll?.myVoteOptionId).toBe('opt-1');
    expect(dto.likesCount).toBe(12);
    expect(dto.isLiked).toBe(true);
    expect(dto.sharesCount).toBe(3);
    expect(dto.isPinned).toBe(true);
  });
});
