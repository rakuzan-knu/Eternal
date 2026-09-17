import { FeedScoringService } from '../feed-scoring.service';
import type { PostWithRelations } from '../../common/contracts/posts';

describe('FeedScoringService', () => {
  let service: FeedScoringService;

  beforeEach(() => {
    service = new FeedScoringService();
  });

  it('ranks higher engagement and video media posts above plain stale posts', () => {
    const now = Date.now();
    const candidateStale: PostWithRelations = {
      id: 'stale-1',
      content: 'old text post',
      authorId: 'author-1',
      author: { id: 'author-1', username: 'stale_user', displayName: 'Stale', avatar: null },
      media: [],
      createdAt: new Date(now - 7 * 24 * 3600 * 1000),
      updatedAt: new Date(now - 7 * 24 * 3600 * 1000),
      _count: { likes: 0, comments: 0, reposts: 0 },
    };

    const candidateHotVideo: PostWithRelations = {
      id: 'hot-video-1',
      content: 'viral video',
      authorId: 'author-2',
      author: { id: 'author-2', username: 'creator', displayName: 'Creator', avatar: null },
      media: [
        {
          id: 'm1',
          type: 'VIDEO',
          url: 'https://example.com/video.mp4',
          poster: null,
          order: 0,
          postId: 'hot-video-1',
        },
      ],
      createdAt: new Date(now - 2 * 3600 * 1000),
      updatedAt: new Date(now - 2 * 3600 * 1000),
      _count: { likes: 150, comments: 40, reposts: 20 },
      isFollowing: true,
    };

    const ranked = service.rankPostCandidates([candidateStale, candidateHotVideo], 'viewer-1', {
      nowMs: now,
    });

    expect(ranked[0].id).toBe('hot-video-1');
    expect(ranked[1].id).toBe('stale-1');
  });

  it('handles empty or single candidate lists gracefully', () => {
    expect(service.rankPostCandidates([])).toEqual([]);
    const single: PostWithRelations = {
      id: 'only-one',
      content: 'solo',
      authorId: 'u1',
      author: { id: 'u1', username: 'u1', displayName: null, avatar: null },
      media: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(service.rankPostCandidates([single])).toEqual([single]);
  });
});
