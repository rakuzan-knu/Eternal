import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { uid } from 'uid';
import { StoryMediaType, StoryPrivacy } from '@prisma/client';
import { PrismaService } from '@common/prisma';
import { RedisService } from '../redis/redis.service';
import { StoriesRepository } from './stories.repository';
import { ConversationsService } from '../messenger/conversations/conversations.service';
import { MessagesService } from '../messenger/messages/messages.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreateStoryDto,
  PollOverlay,
  ReactToStoryDto,
  ReplyToStoryDto,
  StoryOverlay,
  StoryPollResult,
  StoryViewResponse,
  UserStoriesGroup,
  VoteStoryPollDto,
} from '@common/contracts';
import { optimizePostImage, uploadToStorageWithFallback } from '../common/media/image-processor';

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    private readonly storiesRepo: StoriesRepository,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationsService: ConversationsService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {
    this.bucket = this.configService.get<string>('MINIO_BUCKET', 'stories');
    this.publicUrl =
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      'http://localhost:9000';

    this.s3 = new S3Client({
      endpoint:
        this.configService.get<string>('MINIO_ENDPOINT') ??
        this.configService.get<string>('S3_ENDPOINT') ??
        'http://localhost:9000',
      region: 'us-east-1',
      credentials: {
        accessKeyId:
          this.configService.get<string>('MINIO_ACCESS_KEY') ??
          this.configService.get<string>('S3_ACCESS_KEY') ??
          'rootuser',
        secretAccessKey:
          this.configService.get<string>('MINIO_SECRET_KEY') ??
          this.configService.get<string>('S3_SECRET_KEY') ??
          'rootpassword',
      },
      forcePathStyle: true,
    });
  }

  private detectMimeType(buffer: Buffer): { type: StoryMediaType; mime: string; ext: string } {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { type: StoryMediaType.IMAGE, mime: 'image/jpeg', ext: 'jpg' };
    }
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { type: StoryMediaType.IMAGE, mime: 'image/png', ext: 'png' };
    }
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return { type: StoryMediaType.IMAGE, mime: 'image/webp', ext: 'webp' };
    }
    if (buffer.length >= 6 && buffer.toString('ascii', 0, 3) === 'GIF') {
      return { type: StoryMediaType.IMAGE, mime: 'image/gif', ext: 'gif' };
    }
    if (buffer.length >= 8 && buffer.toString('ascii', 4, 8) === 'ftyp') {
      return { type: StoryMediaType.VIDEO, mime: 'video/mp4', ext: 'mp4' };
    }
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3
    ) {
      return { type: StoryMediaType.VIDEO, mime: 'video/webm', ext: 'webm' };
    }
    if (
      (buffer.length >= 4 && buffer.toString('ascii', 0, 4) === 'OggS') ||
      (buffer.length >= 3 && buffer.toString('ascii', 0, 3) === 'ID3') ||
      (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    ) {
      return { type: StoryMediaType.VOICE, mime: 'audio/mpeg', ext: 'mp3' };
    }

    return { type: StoryMediaType.IMAGE, mime: 'image/jpeg', ext: 'jpg' };
  }

  async processUploadedMedia(
    file?: Express.Multer.File,
  ): Promise<{ url: string; mediaType: StoryMediaType }> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('No media file provided');
    }

    const { type, mime, ext } = this.detectMimeType(file.buffer);

    // Enforce size limits: 10MB image, 100MB video, 25MB audio
    const maxImageSize = 10 * 1024 * 1024;
    const maxVideoSize = 100 * 1024 * 1024;
    const maxAudioSize = 25 * 1024 * 1024;

    if (type === StoryMediaType.IMAGE && file.buffer.length > maxImageSize) {
      throw new BadRequestException('Image size exceeds 10MB limit');
    }
    if (type === StoryMediaType.VIDEO && file.buffer.length > maxVideoSize) {
      throw new BadRequestException('Video size exceeds 100MB limit');
    }
    if (type === StoryMediaType.VOICE && file.buffer.length > maxAudioSize) {
      throw new BadRequestException('Audio size exceeds 25MB limit');
    }

    const fileId = uid(16);
    let uploadBuffer = file.buffer;
    let contentType = file.mimetype || mime;
    let fileExt = ext;

    if (type === StoryMediaType.IMAGE) {
      try {
        const optimized = await optimizePostImage(file.buffer);
        uploadBuffer = optimized.buffer;
        contentType = optimized.contentType;
        fileExt = optimized.ext;
      } catch (e) {
        this.logger.warn(`Failed to optimize story image: ${String(e)}`);
      }
    }

    const key = `stories/${fileId}.${fileExt}`;
    const url = await uploadToStorageWithFallback(this.s3, {
      bucket: this.bucket,
      key,
      buffer: uploadBuffer,
      contentType,
      publicUrl: this.publicUrl,
    });

    return { url, mediaType: type };
  }

  private mapStoryToResponse(story: any, viewerId?: string): StoryViewResponse {
    const views = Array.isArray(story.views) ? story.views : [];
    const reactions = Array.isArray(story.reactions) ? story.reactions : [];
    const pollVotes = Array.isArray(story.pollVotes) ? story.pollVotes : [];

    const hasViewed = Boolean(
      viewerId &&
      (story.authorId === viewerId ||
        views.some((v: { viewerId: string }) => v.viewerId === viewerId)),
    );

    const userReaction = viewerId
      ? (reactions.find((r: { userId: string }) => r.userId === viewerId)?.emoji ?? null)
      : null;

    const reactionsCount: Record<string, number> = {};
    for (const r of reactions) {
      reactionsCount[r.emoji] = (reactionsCount[r.emoji] || 0) + 1;
    }

    let pollResult: StoryPollResult | null = null;
    const overlays = Array.isArray(story.overlays) ? (story.overlays as StoryOverlay[]) : [];

    const pollOverlay = overlays.find((o) => o.type === 'poll');
    if (pollOverlay && pollOverlay.options) {
      const voteCounts = new Array(pollOverlay.options.length).fill(0);
      let totalVotes = 0;
      let userVotedIndex: number | null = null;

      for (const v of pollVotes) {
        if (v.optionIndex >= 0 && v.optionIndex < voteCounts.length) {
          voteCounts[v.optionIndex]++;
          totalVotes++;
        }
        if (viewerId && v.userId === viewerId) {
          userVotedIndex = v.optionIndex;
        }
      }

      const options = pollOverlay.options.map((opt, idx) => ({
        text: opt.text,
        voteCount: voteCounts[idx],
        percentage: totalVotes > 0 ? Math.round((voteCounts[idx] / totalVotes) * 100) : 0,
      }));

      pollResult = {
        question: pollOverlay.question,
        totalVotes,
        userVotedIndex,
        options,
      };
    }

    return {
      id: story.id,
      authorId: story.authorId,
      mediaUrl: story.mediaUrl,
      mediaType: story.mediaType,
      caption: story.caption ?? null,
      overlays: overlays.length > 0 ? overlays : null,
      privacy: story.privacy,
      createdAt: story.createdAt instanceof Date ? story.createdAt.toISOString() : story.createdAt,
      expiresAt: story.expiresAt instanceof Date ? story.expiresAt.toISOString() : story.expiresAt,
      viewsCount: views.length,
      hasViewed,
      userReaction,
      reactionsCount,
      pollResult,
      author: {
        id: story.author.id,
        username: story.author.username,
        displayName: story.author.displayName,
        avatar: story.author.avatar,
        isVerified: story.author.isVerified,
      },
    };
  }

  async createStory(
    userId: string,
    dto: CreateStoryDto,
    file?: Express.Multer.File,
  ): Promise<StoryViewResponse> {
    let mediaUrl = '';
    let mediaType = dto.mediaType || StoryMediaType.IMAGE;

    if (file) {
      const processed = await this.processUploadedMedia(file);
      mediaUrl = processed.url;
      mediaType = processed.mediaType;
    } else if (dto.backgroundColor) {
      // Text-only story with background color/gradient placeholder
      mediaUrl = `color:${dto.backgroundColor}`;
      mediaType = StoryMediaType.IMAGE;
    } else {
      throw new BadRequestException('Story media file or background is required');
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours TTL

    const story = await this.storiesRepo.createStory({
      authorId: userId,
      mediaUrl,
      mediaType,
      caption: dto.caption || null,
      overlays: dto.overlays || [],
      privacy: dto.privacy || StoryPrivacy.ALL_FOLLOWERS,
      expiresAt,
    });

    // Invalidate author's feed cache immediately
    await this.redis.del(`stories:feed:${userId}`);

    // Fan-out invalidation in non-blocking background queue/event loop to avoid blocking event loop with 5000+ followers
    setImmediate(() => {
      void this.redis.delByPattern('stories:feed:*').catch((err) => {
        this.logger.warn(`Background Redis cache invalidation error: ${String(err)}`);
      });
    });

    const response = this.mapStoryToResponse(story, userId);

    // Emit real-time WebSocket event for instant story avatar ring lighting on clients
    this.eventEmitter.emit('story.created', {
      authorId: userId,
      story: response,
    });

    return response;
  }

  async getStoriesFeed(userId: string): Promise<UserStoriesGroup[]> {
    const cacheKey = `stories:feed:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as UserStoriesGroup[];
      } catch {
        // Cache parse error, continue to fresh query
      }
    }

    // 1. Get user's following list
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId, status: 'ACCEPTED' },
      select: { followingId: true },
      take: 500,
    });
    const followingUserIds = following.map((f: { followingId: string }) => f.followingId);

    // 2. Get author IDs who have added the user as a Close Friend
    const closeFriendAuthorIds = await this.storiesRepo.getAuthorsWhoAddedViewerAsCloseFriend(
      userId,
      followingUserIds,
    );

    // 3. Find active stories
    const rawStories = await this.storiesRepo.findActiveFeedStories(
      userId,
      followingUserIds,
      closeFriendAuthorIds,
    );

    // 4. Group stories by author
    const groupsMap = new Map<string, StoryViewResponse[]>();
    for (const story of rawStories) {
      const mapped = this.mapStoryToResponse(story, userId);
      const existing = groupsMap.get(story.authorId) || [];
      existing.push(mapped);
      groupsMap.set(story.authorId, existing);
    }

    const userGroups: UserStoriesGroup[] = [];
    for (const [, stories] of groupsMap.entries()) {
      if (stories.length === 0) continue;
      const author = stories[0].author;
      const hasUnviewed = stories.some((s: any) => !s.hasViewed);
      const hasCloseFriendsStory = stories.some(
        (s: any) => s.privacy === StoryPrivacy.CLOSE_FRIENDS,
      );
      const latestStoryTimestamp = stories[stories.length - 1].createdAt;

      userGroups.push({
        user: author,
        hasUnviewed,
        hasCloseFriendsStory,
        stories,
        latestStoryTimestamp,
      });
    }

    // Sort groups:
    // - Current user first
    // - Unviewed groups next (sorted by latest timestamp desc)
    // - Viewed groups last (sorted by latest timestamp desc)
    userGroups.sort((a, b) => {
      if (a.user.id === userId) return -1;
      if (b.user.id === userId) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return (
        new Date(b.latestStoryTimestamp).getTime() - new Date(a.latestStoryTimestamp).getTime()
      );
    });

    // Cache in Redis for 180 seconds (3 minutes) with natural expiration
    await this.redis.set(cacheKey, JSON.stringify(userGroups), 180);

    return userGroups;
  }

  async getUserStories(targetUserId: string, viewerId?: string): Promise<UserStoriesGroup | null> {
    const isCloseFriend = viewerId
      ? await this.storiesRepo.isCloseFriend(targetUserId, viewerId)
      : false;

    const rawStories = await this.storiesRepo.findActiveUserStories(
      targetUserId,
      viewerId,
      isCloseFriend,
    );

    if (!rawStories || rawStories.length === 0) {
      return null;
    }

    const mappedStories = rawStories.map((s: any) => this.mapStoryToResponse(s, viewerId));
    const author = mappedStories[0].author;
    const hasUnviewed = mappedStories.some((s: any) => !s.hasViewed);
    const hasCloseFriendsStory = mappedStories.some(
      (s: any) => s.privacy === StoryPrivacy.CLOSE_FRIENDS,
    );

    return {
      user: author,
      hasUnviewed,
      hasCloseFriendsStory,
      stories: mappedStories,
      latestStoryTimestamp: mappedStories[mappedStories.length - 1].createdAt,
    };
  }

  async recordView(storyId: string, viewerId: string): Promise<void> {
    const story = await this.storiesRepo.findById(storyId);
    if (!story) throw new NotFoundException('Story not found');

    await this.storiesRepo.recordView(storyId, viewerId);
    await this.redis.del(`stories:feed:${viewerId}`);

    // Emit live WebSocket event so author's Seen-by Drawer updates in real time
    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerId },
      select: { id: true, username: true, displayName: true, avatar: true, isVerified: true },
    });

    this.eventEmitter.emit('story.viewed', {
      storyId,
      authorId: story.authorId,
      viewerId,
      viewer: viewer ?? { id: viewerId, username: '', displayName: null, avatar: null },
      viewedAt: new Date().toISOString(),
    });
  }

  async recordReaction(storyId: string, userId: string, dto: ReactToStoryDto) {
    const story = await this.storiesRepo.findById(storyId);
    if (!story) throw new NotFoundException('Story not found');

    const reaction = await this.storiesRepo.recordReaction(storyId, userId, dto.emoji);
    await this.redis.del(`stories:feed:${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, avatar: true },
    });

    // Emit live WebSocket event for real-time seen-by drawer and viewers reaction explosion
    this.eventEmitter.emit('story.reacted', {
      storyId,
      authorId: story.authorId,
      userId,
      user: user ?? { id: userId, username: '', displayName: null, avatar: null },
      emoji: reaction.emoji,
      createdAt: reaction.createdAt.toISOString(),
    });

    return {
      storyId,
      emoji: reaction.emoji,
      createdAt: reaction.createdAt.toISOString(),
    };
  }

  async recordPollVote(
    storyId: string,
    userId: string,
    dto: VoteStoryPollDto,
  ): Promise<StoryPollResult> {
    const story = await this.storiesRepo.findById(storyId);
    if (!story) throw new NotFoundException('Story not found');

    const overlays = Array.isArray(story.overlays) ? (story.overlays as StoryOverlay[]) : [];
    const pollOverlay = overlays.find((o) => o.type === 'poll');
    if (!pollOverlay || !pollOverlay.options) {
      throw new BadRequestException('Story does not have a poll');
    }

    if (dto.optionIndex < 0 || dto.optionIndex >= pollOverlay.options.length) {
      throw new BadRequestException('Invalid poll option index');
    }

    // Save vote in dedicated StoryPollVote table to prevent race conditions
    await this.storiesRepo.recordPollVote(storyId, userId, dto.optionIndex);
    await this.redis.del(`stories:feed:${userId}`);

    // Aggregate votes for real-time response
    const updatedStory = await this.storiesRepo.findById(storyId);
    const mapped = this.mapStoryToResponse(updatedStory, userId);
    const pollResult = mapped.pollResult!;

    // Emit live WebSocket event so poll percentages update live for viewers and author
    this.eventEmitter.emit('story.poll_voted', {
      storyId,
      authorId: story.authorId,
      userId,
      pollResult,
      optionIndex: dto.optionIndex,
    });

    return pollResult;
  }

  async replyToStory(storyId: string, senderId: string, dto: ReplyToStoryDto) {
    const story = await this.storiesRepo.findById(storyId);
    if (!story) throw new NotFoundException('Story not found');

    if (story.authorId === senderId) {
      throw new BadRequestException('Cannot reply to your own story');
    }

    // 1. Create or fetch Direct Message conversation between sender and story author
    const conv = await this.conversationsService.createDirect(senderId, {
      participantId: story.authorId,
    });

    // 2. Prepare rich message text with story embed preview
    const storyMediaPreview =
      story.mediaType === StoryMediaType.IMAGE
        ? story.mediaUrl
        : story.mediaType === StoryMediaType.VIDEO
          ? story.mediaUrl
          : undefined;

    const messageText = dto.text.trim();

    // 3. Send message via MessagesService
    const sentMessage = await this.messagesService.send(conv.id, senderId, {
      conversationId: conv.id,
      text: messageText,
      messageType: 'STORY_REPLY',
      attachments: storyMediaPreview
        ? [
            {
              type: story.mediaType === StoryMediaType.VIDEO ? 'VIDEO' : 'IMAGE',
              url: storyMediaPreview,
              fileName: `story_reply_${story.id}`,
            },
          ]
        : undefined,
    });

    return {
      conversationId: conv.id,
      message: sentMessage,
    };
  }

  async getStoryViewers(storyId: string, authorId: string) {
    const story = await this.storiesRepo.findById(storyId);
    if (!story) throw new NotFoundException('Story not found');
    if (story.authorId !== authorId) {
      throw new ForbiddenException('Only the story author can view viewers list');
    }

    return this.storiesRepo.getStoryViewers(storyId);
  }

  async deleteStory(storyId: string, authorId: string): Promise<boolean> {
    const story = await this.storiesRepo.findById(storyId);
    if (!story) throw new NotFoundException('Story not found');
    if (story.authorId !== authorId) {
      throw new ForbiddenException('Cannot delete a story you do not own');
    }

    // Clean up physical file from S3 if applicable
    if (
      story.mediaUrl &&
      !story.mediaUrl.startsWith('color:') &&
      !story.mediaUrl.startsWith('data:')
    ) {
      try {
        const urlParts = story.mediaUrl.split('/');
        const key = `stories/${urlParts[urlParts.length - 1]}`;
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
          }),
        );
      } catch (e) {
        this.logger.warn(`Failed to delete S3 file for story ${storyId}: ${String(e)}`);
      }
    }

    await this.storiesRepo.deleteStory(storyId, authorId);
    await this.redis.delByPattern('stories:feed:*');

    return true;
  }

  async getCloseFriends(userId: string) {
    const records = await this.storiesRepo.getCloseFriends(userId);
    return records.map((r: any) => r.friend);
  }

  async toggleCloseFriend(userId: string, friendId: string) {
    if (userId === friendId) {
      throw new BadRequestException('Cannot add yourself to close friends');
    }
    const res = await this.storiesRepo.toggleCloseFriend(userId, friendId);
    await this.redis.delByPattern('stories:feed:*');
    return res;
  }
}
