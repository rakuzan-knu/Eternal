import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { uid } from 'uid';
import { StoryMediaType, StoryPrivacy, NotificationType } from '@prisma/client';
export { StoryMediaType, StoryPrivacy } from '@prisma/client';
import { isR2Endpoint } from '../common/storage/storage-url.util';
import { RedisService } from '../redis/redis.service';
import { StoriesRepository, type StoryWithDetails } from './stories.repository';
import { ConversationsService } from '../messenger/conversations/conversations.service';
import { MessagesService } from '../messenger/messages/messages.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreateNotificationEvent,
  NOTIFICATION_EVENTS,
} from '../notifications/events/notification.events';
import {
  CreateStoryDto,
  PollOverlay,
  ImageOverlay,
  MentionOverlay,
  AudioOverlay,
  ReactToStoryDto,
  ReplyToStoryDto,
  StoryOverlay,
  StoryPollResult,
  StoryViewResponse,
  UserStoriesGroup,
  VoteStoryPollDto,
} from '@common/contracts';
import { optimizePostImage, uploadToStorageWithFallback } from '../common/media/image-processor';

import { StoryViewsCoalescerService } from './coalescing/story-views-coalescer.service';

@Injectable()
export class StoriesService implements OnModuleDestroy {
  private readonly logger = new Logger(StoriesService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  onModuleDestroy(): void {
    this.s3.destroy();
  }

  constructor(
    private readonly storiesRepo: StoriesRepository,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationsService: ConversationsService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
    @Optional()
    private readonly storyViewsCoalescer?: StoryViewsCoalescerService,
  ) {
    this.bucket =
      this.configService.get<string>('R2_BUCKET') ??
      this.configService.get<string>('MINIO_BUCKET', 'stories');
    this.publicUrl =
      this.configService.get<string>('R2_PUBLIC_URL') ??
      this.configService.get<string>('MINIO_PUBLIC_URL') ??
      this.configService.get<string>('S3_PUBLIC_URL') ??
      'http://localhost:9000';

    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const endpoint =
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined) ??
      this.configService.get<string>('R2_ENDPOINT') ??
      this.configService.get<string>('MINIO_ENDPOINT') ??
      this.configService.get<string>('S3_ENDPOINT') ??
      'http://localhost:9000';

    const isR2 = Boolean(accountId) || isR2Endpoint(endpoint);

    this.s3 = new S3Client({
      endpoint,
      region: isR2 ? 'auto' : 'us-east-1',
      credentials: {
        accessKeyId:
          this.configService.get<string>('R2_ACCESS_KEY_ID') ??
          this.configService.get<string>('MINIO_ACCESS_KEY') ??
          this.configService.get<string>('S3_ACCESS_KEY') ??
          'rootuser',
        secretAccessKey:
          this.configService.get<string>('R2_SECRET_ACCESS_KEY') ??
          this.configService.get<string>('MINIO_SECRET_KEY') ??
          this.configService.get<string>('S3_SECRET_KEY') ??
          'rootpassword',
      },
      forcePathStyle: !isR2,
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

  private mapStoryToResponse(story: StoryWithDetails, viewerId?: string): StoryViewResponse {
    const views = Array.isArray(story.views) ? story.views : [];
    const reactions = Array.isArray(story.reactions) ? story.reactions : [];
    const pollVotes = Array.isArray(story.pollVotes) ? story.pollVotes : [];

    const hasViewed = Boolean(
      viewerId && (story.authorId === viewerId || views.some((v) => v.viewerId === viewerId)),
    );

    const userReaction = viewerId
      ? (reactions.find((r) => r.userId === viewerId)?.emoji ?? null)
      : null;

    const reactionsCount: Record<string, number> = {};
    for (const r of reactions) {
      reactionsCount[r.emoji] = (reactionsCount[r.emoji] || 0) + 1;
    }

    let pollResult: StoryPollResult | null = null;
    const rawOverlays = Array.isArray(story.overlays)
      ? (story.overlays as unknown as StoryOverlay[])
      : [];
    const overlays: StoryOverlay[] = rawOverlays.map((o) => {
      if (o.type === 'image' && (o.isMainMedia || !o.url || String(o.url).startsWith('blob:'))) {
        return {
          ...o,
          url: story.mediaUrl,
        };
      }
      return o;
    });

    const pollOverlay = overlays.find((o): o is PollOverlay => o.type === 'poll');
    if (pollOverlay && pollOverlay.options) {
      const voteCounts = pollOverlay.options.map(() => 0);
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

      const options = pollOverlay.options.map((opt: { text: string }, idx: number) => ({
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

    let finalOverlays = dto.overlays || [];
    if (file && Array.isArray(finalOverlays)) {
      finalOverlays = finalOverlays.map((o) => {
        if (o.type === 'image' && (o.isMainMedia || !o.url || String(o.url).startsWith('blob:'))) {
          return {
            ...o,
            url: mediaUrl,
          };
        }
        return o;
      });
    }

    const story = await this.storiesRepo.createStory({
      authorId: userId,
      mediaUrl,
      mediaType,
      caption: dto.caption || null,
      overlays: finalOverlays,
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

    // Notify mentioned users in real-time
    const mentions = (finalOverlays || []).filter(
      (o): o is MentionOverlay => o.type === 'mention' && !!o.username,
    );
    if (mentions.length > 0) {
      const usernames = Array.from(
        new Set(mentions.map((m) => m.username.toLowerCase().replace(/^@/, ''))),
      );
      void this.storiesRepo
        .findUsersByUsernames(usernames)
        .then(async (targets: { id: string; username: string }[]) => {
          const author = await this.storiesRepo.findUserBasic(userId);

          for (const target of targets) {
            if (target.id !== userId) {
              // 1. Notification on /notifications
              this.eventEmitter.emit(
                NOTIFICATION_EVENTS.CREATE,
                new CreateNotificationEvent(target.id, NotificationType.MENTION, {
                  actorId: userId,
                  text: JSON.stringify({
                    storyId: story.id,
                    mediaUrl: story.mediaUrl,
                    mediaType: story.mediaType,
                    authorUsername: author?.username || '',
                    kind: 'story_mention',
                  }),
                }),
              );

              // 2. Direct Message in Chat with Story preview card
              try {
                const conv = await this.conversationsService.createDirect(userId, {
                  participantId: target.id,
                });

                const overlays = Array.isArray(story.overlays)
                  ? (story.overlays as unknown as StoryOverlay[])
                  : [];
                type StoryAudioOverlay = AudioOverlay & { trackCover?: string };
                const audioOverlay = overlays.find(
                  (o): o is StoryAudioOverlay => o?.type === 'audio',
                );
                const imageOverlay = overlays.find((o): o is ImageOverlay => o?.type === 'image');
                let storyMediaPreview = story.mediaUrl;
                let storyThumbnail = author?.avatar || undefined;

                if (!storyMediaPreview || storyMediaPreview.startsWith('color:')) {
                  const audioCover = audioOverlay?.trackCover || audioOverlay?.albumArt;
                  if (audioCover) {
                    storyMediaPreview = audioCover;
                    storyThumbnail = audioCover;
                  } else if (imageOverlay?.url) {
                    storyMediaPreview = imageOverlay.url;
                    storyThumbnail = imageOverlay.url;
                  } else {
                    storyMediaPreview = story.mediaUrl || 'color:#09090b';
                  }
                }

                await this.messagesService.send(conv.id, userId, {
                  conversationId: conv.id,
                  text: 'Mentioned you in their story',
                  messageType: 'STORY_REPLY',
                  attachments: [
                    {
                      type: story.mediaType === StoryMediaType.VIDEO ? 'VIDEO' : 'IMAGE',
                      url: storyMediaPreview,
                      fileName: `story_reply_${story.id}`,
                      thumbnailUrl: storyThumbnail,
                    },
                  ],
                });
              } catch (dmErr) {
                this.logger.warn(
                  `Failed to send story mention DM to ${target.id}: ${String(dmErr)}`,
                );
              }
            }
          }
        })
        .catch((err: unknown) => {
          this.logger.warn(`Failed to notify mentioned users: ${String(err)}`);
        });
    }

    return response;
  }

  async getStoriesFeed(userId: string): Promise<UserStoriesGroup[]> {
    const cacheKey = `stories:feed:${userId}`;

    return this.redis.getOrSetWithProbabilisticEarlyExpiration(cacheKey, 180, async () => {
      // 1. Get user's following list
      const followingUserIds = await this.storiesRepo.getFollowingIds(userId, 500);

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
        const hasUnviewed = stories.some((s) => !s.hasViewed);
        const hasCloseFriendsStory = stories.some((s) => s.privacy === StoryPrivacy.CLOSE_FRIENDS);
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

      return userGroups;
    });
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

    const mappedStories = rawStories.map((s) => this.mapStoryToResponse(s, viewerId));
    const author = mappedStories[0].author;
    const hasUnviewed = mappedStories.some((s) => !s.hasViewed);
    const hasCloseFriendsStory = mappedStories.some(
      (s) => s.privacy === StoryPrivacy.CLOSE_FRIENDS,
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

    if (this.storyViewsCoalescer) {
      this.storyViewsCoalescer.recordView(storyId, viewerId);
    } else {
      await this.storiesRepo.recordView(storyId, viewerId);
    }
    await this.redis.del(`stories:feed:${viewerId}`);

    // Emit live WebSocket event so author's Seen-by Drawer updates in real time
    const viewer = await this.storiesRepo.findUserBasic(viewerId);

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

    const user = await this.storiesRepo.findUserBasic(userId);

    // Emit live WebSocket event for real-time seen-by drawer and viewers reaction explosion
    this.eventEmitter.emit('story.reacted', {
      storyId,
      authorId: story.authorId,
      userId,
      user: user ?? { id: userId, username: '', displayName: null, avatar: null },
      emoji: reaction.emoji,
      createdAt: reaction.createdAt.toISOString(),
    });

    // Notify story author on notifications page if someone else reacted
    if (story.authorId !== userId && dto.emoji) {
      const storyAuthor = await this.storiesRepo.findUserBasic(story.authorId);

      this.eventEmitter.emit(
        NOTIFICATION_EVENTS.CREATE,
        new CreateNotificationEvent(story.authorId, NotificationType.LIKE_POST, {
          actorId: userId,
          text: JSON.stringify({
            storyId: story.id,
            mediaUrl: story.mediaUrl,
            mediaType: story.mediaType,
            authorUsername: storyAuthor?.username || '',
            kind: 'story_like',
            emoji: dto.emoji,
          }),
        }),
      );
    }

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
    const pollOverlay = overlays.find((o): o is PollOverlay => o.type === 'poll');
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
    if (!updatedStory) {
      throw new NotFoundException('Story not found');
    }
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
    const overlays = Array.isArray(story.overlays) ? (story.overlays as StoryOverlay[]) : [];
    type StoryAudioOverlay = AudioOverlay & { trackCover?: string };
    const audioOverlay = overlays.find((o): o is StoryAudioOverlay => o.type === 'audio');
    const imageOverlay = overlays.find((o): o is ImageOverlay => o.type === 'image');

    let storyMediaPreview = story.mediaUrl;
    let storyThumbnail = story.author.avatar ?? undefined;

    if (!storyMediaPreview || storyMediaPreview.startsWith('color:')) {
      const audioCover = audioOverlay?.trackCover || audioOverlay?.albumArt;
      if (audioCover) {
        storyMediaPreview = audioCover;
        storyThumbnail = audioCover;
      } else if (imageOverlay?.url) {
        storyMediaPreview = imageOverlay.url;
        storyThumbnail = imageOverlay.url;
      } else {
        storyMediaPreview = story.mediaUrl || 'color:#09090b';
      }
    }

    const messageText = dto.text.trim();

    // 3. Send message via MessagesService
    const sentMessage = await this.messagesService.send(conv.id, senderId, {
      conversationId: conv.id,
      text: messageText,
      messageType: 'STORY_REPLY',
      attachments: [
        {
          type: story.mediaType === StoryMediaType.VIDEO ? 'VIDEO' : 'IMAGE',
          url: storyMediaPreview,
          fileName: `story_reply_${story.id}`,
          thumbnailUrl: storyThumbnail,
        },
      ],
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

    this.eventEmitter.emit('story.deleted', { storyId, authorId });

    return true;
  }

  async getCloseFriends(userId: string) {
    const records = await this.storiesRepo.getCloseFriends(userId);
    return records.map((r) => r.friend);
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
