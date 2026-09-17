import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { CompactFeedResponseDto, CompactPostDto } from '@common/contracts';
import {
  POSTS_REPOSITORY,
  type IPostRepository,
} from '../posts/interfaces/posts-repository.interface';
import { FeedScoringService } from '../posts/feed-scoring.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class FeedBffService {
  private readonly logger = new Logger(FeedBffService.name);
  private static readonly CACHE_COMPACT_FEED_PREFIX = 'bff:feed:compact:';

  constructor(
    @Inject(POSTS_REPOSITORY)
    private readonly postsRepository: IPostRepository,
    private readonly redis: RedisService,
    @Optional()
    private readonly feedScoringService?: FeedScoringService,
  ) {}

  async getCompactFeed(
    limit: number = 20,
    after?: string,
    viewerId?: string,
    algorithm: 'latest' | 'ml' = 'latest',
  ): Promise<CompactFeedResponseDto> {
    const fetchFeed = async (): Promise<CompactFeedResponseDto> => {
      // Overfetch by 1 to compute hasMore/nextCursor efficiently
      const fetchLimit = limit + 1;
      let rawPosts = await this.postsRepository.getAllPosts(
        algorithm === 'ml' ? Math.max(fetchLimit * 3, 40) : fetchLimit,
        after,
        viewerId,
      );

      if (algorithm === 'ml' && this.feedScoringService) {
        rawPosts = this.feedScoringService.rankPostCandidates(rawPosts, viewerId);
      }

      const hasMore = rawPosts.length > limit;
      const sliced = hasMore ? rawPosts.slice(0, limit) : rawPosts;
      const nextCursor = hasMore && sliced.length > 0 ? sliced[sliced.length - 1].id : null;

      const items = sliced.map((post) => CompactPostDto.fromPost(post));

      return {
        data: items,
        meta: {
          nextCursor,
          hasMore,
          count: items.length,
        },
      };
    };

    // Anonymous requests can leverage Redis caching for high throughput
    if (!viewerId) {
      const cacheKey = `${FeedBffService.CACHE_COMPACT_FEED_PREFIX}${limit}:${after ?? 'first'}:${algorithm}`;
      return this.redis.getOrSet(cacheKey, 30, fetchFeed);
    }

    return fetchFeed();
  }
}
