import { MediaType, ReportCategory } from '@prisma/client';
import {
  mediaSchema,
  createPostSchema,
  editPostSchema,
  getPostsQuerySchema,
  searchPostsSchema,
  reportPostSchema,
  PostMediaResponseDto,
  PostResponseDto,
  type PostWithRelations,
} from '../posts';

describe('posts.contract', () => {
  describe('schemas', () => {
    it('validates mediaSchema', () => {
      const media = mediaSchema.parse({
        type: MediaType.IMAGE,
        url: 'https://example.com/image.jpg',
        poster: 'https://example.com/poster.jpg',
        order: 1,
      });
      expect(media.type).toBe(MediaType.IMAGE);
      expect(media.order).toBe(1);
    });

    it('validates createPostSchema with preprocessed JSON strings', () => {
      const valid = createPostSchema.parse({
        content: '  Exciting announcement!  ',
        media: JSON.stringify([{ type: 'IMAGE', url: 'https://example.com/pic.png' }]),
        gifUrls: JSON.stringify(['https://gif.com/1.gif']),
        poll: JSON.stringify(['Option A', 'Option B']),
      });

      expect(valid.content).toBe('Exciting announcement!');
      expect(valid.media).toHaveLength(1);
      expect(valid.gifUrls).toEqual(['https://gif.com/1.gif']);
      expect(valid.poll).toEqual(['Option A', 'Option B']);
    });

    it('handles non-JSON string fallbacks in createPostSchema preprocessors', () => {
      const valid = createPostSchema.parse({
        gifUrls: 'single-gif-string',
        poll: 'single-poll-string',
      });
      expect(valid.gifUrls).toEqual(['single-gif-string']);
      expect(valid.poll).toEqual(['single-poll-string']);

      // Invalid media string fallback
      expect(() =>
        createPostSchema.parse({
          media: 'not-json',
        }),
      ).toThrow();
    });

    it('validates editPostSchema, getPostsQuerySchema, searchPostsSchema, reportPostSchema', () => {
      expect(editPostSchema.parse({ content: ' Updated text ' })).toEqual({
        content: 'Updated text',
      });

      expect(getPostsQuerySchema.parse({})).toEqual({ limit: 20 });
      expect(getPostsQuerySchema.parse({ limit: '50' })).toEqual({ limit: 50 });

      expect(searchPostsSchema.parse({ q: 'news', mediaOnly: 'true' })).toEqual({
        q: 'news',
        limit: 20,
        mediaOnly: true,
      });

      expect(
        reportPostSchema.parse({
          category: ReportCategory.SPAM,
          details: 'Obvious bot post',
        }),
      ).toEqual({
        category: ReportCategory.SPAM,
        details: 'Obvious bot post',
      });
    });
  });

  describe('PostMediaResponseDto & PostResponseDto.fromPrisma', () => {
    const rawMedia = {
      id: 'med-1',
      postId: 'post-1',
      type: MediaType.VIDEO,
      url: 'https://video.com/vid.mp4',
      poster: 'https://video.com/thumb.jpg',
      order: 0,
      createdAt: new Date(),
    };

    it('transforms PostMedia to PostMediaResponseDto', () => {
      const dto = PostMediaResponseDto.fromPrisma(rawMedia);
      expect(dto).toEqual({
        id: 'med-1',
        type: MediaType.VIDEO,
        url: 'https://video.com/vid.mp4',
        poster: 'https://video.com/thumb.jpg',
        order: 0,
      });
    });

    it('transforms full post with relations, poll, media, and counts', () => {
      const createdDate = new Date('2026-05-01T10:00:00.000Z');
      const updatedDate = new Date('2026-05-01T12:00:00.000Z'); // 2 hours later -> triggers isEdited

      const postWithRel: PostWithRelations = {
        id: 'post-1',
        content: 'Hello Social Network',
        sharesCount: 12,
        authorId: 'auth-1',
        author: {
          id: 'auth-1',
          username: 'author_john',
          displayName: 'John Author',
          avatar: 'https://avatar.com/john.jpg',
          isVerified: true,
          primaryBadge: 'verified',
        },
        createdAt: createdDate,
        updatedAt: updatedDate,
        media: [rawMedia],
        poll: {
          id: 'poll-1',
          title: 'Which language?',
          description: 'Vote below',
          isMultiple: false,
          isActive: true,
          options: [
            { id: 'opt-ts', optionText: 'TypeScript', votesCount: 80 },
            { id: 'opt-rs', optionText: 'Rust', votesCount: 20 },
          ],
          votes: [{ optionId: 'opt-ts' }],
        },
        isFollowing: true,
        isSaved: true,
        isReposted: false,
        isLiked: true,
        isOwner: false,
        isPinned: true,
        pinnedAt: new Date('2026-05-01T11:00:00.000Z'),
        editedAt: null,
        _count: {
          likes: 100,
          reposts: 25,
          comments: 30,
        },
      };

      const dto = PostResponseDto.fromPrisma(postWithRel);

      expect(dto.id).toBe('post-1');
      expect(dto.author).toBe('John Author');
      expect(dto.handle).toBe('author_john');
      expect(dto.media).toHaveLength(1);
      expect(dto.poll?.totalVotes).toBe(100);
      expect(dto.poll?.myVoteOptionId).toBe('opt-ts');
      expect(dto.poll?.options[0].text).toBe('TypeScript');
      expect(dto.isLiked).toBe(true);
      expect(dto.isSaved).toBe(true);
      expect(dto.likesCount).toBe(100);
      expect(dto.repostsCount).toBe(25);
      expect(dto.sharesCount).toBe(12);
      expect(dto.commentsCount).toBe(30);
      expect(dto.editedAt).toBe(updatedDate.toISOString());
      expect(dto.pinnedAt).toBe('2026-05-01T11:00:00.000Z');
    });

    it('handles post without poll, without media, without author, string editedAt and pinned fallback', () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      const minimalPost: PostWithRelations = {
        id: 'post-min',
        content: 'Minimal content',
        authorId: 'anon-id',
        author: null,
        createdAt: { toISOString: () => '2026-01-01T00:00:00.000Z' } as unknown as Date,
        updatedAt: now,
        isPinned: true,
        pinnedAt: null,
        editedAt: '2026-01-02T00:00:00.000Z',
      };

      const dto = PostResponseDto.fromPrisma(minimalPost);

      expect(dto.author).toBe('User');
      expect(dto.handle).toBe('user');
      expect(dto.avatar).toBeNull();
      expect(dto.media).toEqual([]);
      expect(dto.poll).toBeNull();
      expect(dto.editedAt).toBe('2026-01-02T00:00:00.000Z');
      expect(dto.pinnedAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });
});
