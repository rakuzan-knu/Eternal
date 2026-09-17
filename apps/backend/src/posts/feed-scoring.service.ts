import { Injectable, Logger } from '@nestjs/common';
import type { PostWithRelations } from '../common/contracts/posts';
import { scorePopularity, scoreRecency } from '@social-network/feed-score';

@Injectable()
export class FeedScoringService {
  private readonly logger = new Logger(FeedScoringService.name);

  /**
   * Scores and ranks candidate posts for an active viewer or global discovery using
   * mathematical decay, engagement velocity, relationship affinity, and rich media weighting.
   */
  rankPostCandidates(
    candidates: PostWithRelations[],
    viewerId?: string,
    options?: {
      recencyHalfLifeHours?: number;
      nowMs?: number;
    },
  ): PostWithRelations[] {
    if (candidates.length <= 1) {
      return candidates;
    }

    const nowMs = options?.nowMs ?? Date.now();
    const halfLife = options?.recencyHalfLifeHours ?? 48;

    const scored = candidates.map((post) => {
      // 1. Recency Decay Score [0..1]
      const createdAtMs = new Date(post.createdAt).getTime();
      const recency = scoreRecency(createdAtMs, nowMs, halfLife);

      // 2. Engagement / Popularity Score [0..1]
      const likes = post._count?.likes ?? 0;
      const comments = post._count?.comments ?? 0;
      const reposts = post._count?.reposts ?? 0;
      const totalEngagement = likes + comments * 2 + reposts * 1.5;
      const popularity = scorePopularity(totalEngagement, 3);

      // 3. Affinity Score: viewer following author, or past post interaction
      let affinity = 0.15;
      if (viewerId) {
        if (post.authorId === viewerId) {
          affinity = 0.5;
        } else if (post.isFollowing) {
          affinity = 0.95;
        } else if (post.isLiked || post.isSaved) {
          affinity = 0.75;
        }
      }

      // 4. Media richness boost (1.0 to 1.35)
      let mediaBonus = 1.0;
      if (post.media && post.media.length > 0) {
        const hasVideo = post.media.some((m) => m.type === 'VIDEO');
        if (hasVideo) {
          mediaBonus = 1.35;
        } else {
          mediaBonus = 1.15;
        }
      }

      // Weighted combination
      // Recency 35%, Popularity 35%, Affinity 30%, multiplied by media richness
      const baseScore = recency * 0.35 + popularity * 0.35 + affinity * 0.3;
      const compositeScore = baseScore * mediaBonus;

      return {
        post,
        score: compositeScore,
      };
    });

    // Sort descending by ML composite score
    scored.sort((a, b) => b.score - a.score);

    return scored.map((s) => s.post);
  }
}
