import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import type {
  CommunityPageQuery,
  CommunitySummary,
  CreateCommunityDto,
  CreateCommunityChannelDto,
  CreateCommunityInviteDto,
  CommunityRoleDto,
  CommunityChannelLayoutDto,
  CommunityChannelArchiveDto,
  CommunityChannelAccessDto,
  UpdateCommunityNotificationPreferencesDto,
  UpdateCommunityChannelNotificationPreferencesDto,
} from '@common/contracts';
import { UnreadProjectionService } from '../unread/unread-projection.service';
import { CommunitiesRepository, type CommunityPublicRow } from './communities.repository';

@Injectable()
export class CommunitiesService {
  constructor(
    private readonly repository: CommunitiesRepository,
    @Optional() private readonly unreadProjection?: UnreadProjectionService,
  ) {}

  private summary(row: CommunityPublicRow): CommunitySummary {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      avatar: row.avatar,
      createdAt: row.createdAt.toISOString(),
      memberCount: row._count.members,
    };
  }

  private page<T>(rows: T[], limit: number, cursor: (row: T) => string) {
    const data = rows.slice(0, limit);
    return {
      data,
      nextCursor: rows.length > limit && data.length ? cursor(data[data.length - 1]) : null,
    };
  }

  private token(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new NotFoundException('This invitation is unavailable or has expired');
    return token;
  }

  async list(query: CommunityPageQuery, userId?: string) {
    const page = this.page(await this.repository.list(query, userId), query.limit, (row) => row.id);
    return { ...page, data: page.data.map((row) => this.summary(row)) };
  }
  async detail(id: string) {
    return this.summary(await this.repository.publicDetail(id));
  }
  async create(userId: string, dto: CreateCommunityDto) {
    return this.summary(await this.repository.create(userId, dto));
  }
  async update(id: string, userId: string, dto: CreateCommunityDto) {
    return this.summary(await this.repository.update(id, userId, dto));
  }
  notificationPreferences(
    id: string,
    userId: string,
    dto?: UpdateCommunityNotificationPreferencesDto,
  ) {
    return this.repository.notificationPreferences(id, userId, dto);
  }
  channelNotificationPreferences(
    id: string,
    channelId: string,
    userId: string,
    dto?: UpdateCommunityChannelNotificationPreferencesDto,
  ) {
    return this.repository.channelNotificationPreferences(id, channelId, userId, dto);
  }
  async channels(id: string, userId: string) {
    const result = await this.repository.channels(id, userId);
    if (!this.unreadProjection) return result;
    const counts = new Map<string, number>();
    for (let start = 0; start < result.data.length; start += 100) {
      const batch = await this.unreadProjection.getConversationCounts(
        userId,
        result.data.slice(start, start + 100).map((channel) => channel.conversationId),
      );
      for (const [id, count] of batch) counts.set(id, count);
    }
    return {
      ...result,
      data: result.data.map((channel) => ({
        ...channel,
        unreadCount: counts.get(channel.conversationId) ?? 0,
      })),
    };
  }
  createChannel(id: string, userId: string, dto: CreateCommunityChannelDto) {
    return this.repository.createChannel(id, userId, dto);
  }
  updateChannelLayout(id: string, userId: string, dto: CommunityChannelLayoutDto) {
    return this.repository.updateChannelLayout(id, userId, dto);
  }
  channelAccess(id: string, channelId: string, userId: string) {
    return this.repository.channelAccess(id, channelId, userId);
  }
  setChannelAccess(id: string, channelId: string, userId: string, dto: CommunityChannelAccessDto) {
    return this.repository.setChannelAccess(id, channelId, userId, dto);
  }
  setChannelArchived(
    id: string,
    channelId: string,
    userId: string,
    dto: CommunityChannelArchiveDto,
  ) {
    return this.repository.setChannelArchived(id, channelId, userId, dto);
  }
  async members(id: string, userId: string, query: CommunityPageQuery, banned = false) {
    return this.page(
      await this.repository.members(id, userId, query, banned),
      query.limit,
      (row) => row.userId,
    );
  }
  createInvite(id: string, userId: string, dto: CreateCommunityInviteDto) {
    return this.repository.createInvite(id, userId, dto);
  }
  async invites(id: string, userId: string, query: CommunityPageQuery) {
    return this.page(
      await this.repository.invites(id, userId, query),
      query.limit,
      (row) => row.id,
    );
  }
  revoke(id: string, inviteId: string, userId: string) {
    return this.repository.revoke(id, inviteId, userId);
  }
  async preview(token: string) {
    const preview = await this.repository.preview(this.token(token));
    return {
      community: this.summary(preview.community),
      expiresAt: preview.expiresAt.toISOString(),
    };
  }
  accept(token: string, userId: string) {
    return this.repository.accept(this.token(token), userId);
  }
  remove(
    id: string,
    actorId: string,
    targetId: string,
    action: 'leave' | 'kick' | 'ban' | 'unban',
  ) {
    return this.repository.remove(id, actorId, targetId, action);
  }
  setRole(id: string, actorId: string, targetId: string, dto: CommunityRoleDto) {
    return this.repository.setRole(id, actorId, targetId, dto.role);
  }
  transfer(id: string, actorId: string, targetId: string) {
    return this.repository.transfer(id, actorId, targetId);
  }
}
