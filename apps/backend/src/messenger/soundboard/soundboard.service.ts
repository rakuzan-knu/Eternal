import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import { ConversationsService } from '../conversations/conversations.service';
import type { CreateSoundboardDto, SoundboardItemDto } from './soundboard.types';
import { randomUUID } from 'node:crypto';

@Injectable()
export class SoundboardService implements OnModuleInit {
  private readonly logger = new Logger(SoundboardService.name);
  private isTableInitialized = false;

  // Resilient in-memory fallback cache (used when DB table is unavailable or in mock test envs)
  private readonly memoryUserSounds = new Map<string, SoundboardItemDto[]>();
  private readonly memoryChatSounds = new Map<string, SoundboardItemDto[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly convsService: ConversationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureTableSchema();
  }

  private async ensureTableSchema(): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS soundboard_sounds (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          emoji TEXT NOT NULL,
          scope TEXT NOT NULL,
          user_id TEXT,
          conversation_id TEXT,
          duration_ms INT NOT NULL DEFAULT 1000,
          audio_data TEXT,
          audio_url TEXT,
          author_name TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_soundboard_user_id ON soundboard_sounds(user_id);
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_soundboard_conv_id ON soundboard_sounds(conversation_id);
      `);

      this.isTableInitialized = true;
      this.logger.log('Soundboard table schema successfully verified/initialized');
    } catch (err) {
      this.logger.warn(
        `Failed to initialize Postgres soundboard table (fallback to memory mode): ${String(err)}`,
      );
      this.isTableInitialized = false;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                              USER SOUNDS ('my')                            */
  /* -------------------------------------------------------------------------- */

  async getMySounds(userId: string): Promise<SoundboardItemDto[]> {
    if (this.isTableInitialized) {
      try {
        const rows = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT id, name, emoji, scope, user_id as "userId", duration_ms as "durationMs", audio_data as "audioData", audio_url as "audioUrl", author_name as "authorName", EXTRACT(EPOCH FROM created_at)*1000 as "createdAt"
           FROM soundboard_sounds
           WHERE user_id = $1 AND scope = 'my'
           ORDER BY created_at DESC;`,
          userId,
        );

        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          emoji: r.emoji,
          scope: 'my',
          userId: r.userId,
          durationMs: Number(r.durationMs) || 1000,
          audioData: r.audioData || undefined,
          audioUrl: r.audioUrl || undefined,
          authorName: r.authorName || undefined,
          createdAt: Number(r.createdAt) || Date.now(),
        }));
      } catch (err) {
        this.logger.warn(`Postgres getMySounds error, reading from memory cache: ${String(err)}`);
      }
    }

    return this.memoryUserSounds.get(userId) || [];
  }

  async createMySound(
    userId: string,
    authorName: string,
    dto: CreateSoundboardDto,
  ): Promise<SoundboardItemDto> {
    const id = `my_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const now = Date.now();
    const item: SoundboardItemDto = {
      id,
      name: dto.name.trim(),
      emoji: dto.emoji.trim() || '🔊',
      scope: 'my',
      userId,
      durationMs: dto.durationMs || 1000,
      audioData: dto.audioData || undefined,
      audioUrl: dto.audioUrl || undefined,
      authorName,
      createdAt: now,
    };

    if (this.isTableInitialized) {
      try {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO soundboard_sounds (id, name, emoji, scope, user_id, duration_ms, audio_data, audio_url, author_name, created_at)
           VALUES ($1, $2, $3, 'my', $4, $5, $6, $7, $8, NOW());`,
          item.id,
          item.name,
          item.emoji,
          userId,
          item.durationMs,
          item.audioData || null,
          item.audioUrl || null,
          item.authorName || null,
        );
      } catch (err) {
        this.logger.warn(
          `Failed to insert into soundboard_sounds, saving to memory fallback: ${String(err)}`,
        );
      }
    }

    const existing = this.memoryUserSounds.get(userId) || [];
    this.memoryUserSounds.set(userId, [item, ...existing]);

    return item;
  }

  async deleteMySound(userId: string, id: string): Promise<{ success: boolean }> {
    if (this.isTableInitialized) {
      try {
        await this.prisma.$executeRawUnsafe(
          `DELETE FROM soundboard_sounds WHERE id = $1 AND user_id = $2;`,
          id,
          userId,
        );
      } catch (err) {
        this.logger.warn(`Failed to delete from soundboard_sounds: ${String(err)}`);
      }
    }

    const existing = this.memoryUserSounds.get(userId) || [];
    this.memoryUserSounds.set(
      userId,
      existing.filter((s) => s.id !== id),
    );

    return { success: true };
  }

  /* -------------------------------------------------------------------------- */
  /*                             CHAT SOUNDS ('chat')                           */
  /* -------------------------------------------------------------------------- */

  async getChatSounds(conversationId: string, userId: string): Promise<SoundboardItemDto[]> {
    // Verify membership in conversation
    await this.convsService.assertMember(conversationId, userId);

    if (this.isTableInitialized) {
      try {
        const rows = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT id, name, emoji, scope, conversation_id as "conversationId", user_id as "userId", duration_ms as "durationMs", audio_data as "audioData", audio_url as "audioUrl", author_name as "authorName", EXTRACT(EPOCH FROM created_at)*1000 as "createdAt"
           FROM soundboard_sounds
           WHERE conversation_id = $1 AND scope = 'chat'
           ORDER BY created_at DESC;`,
          conversationId,
        );

        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          emoji: r.emoji,
          scope: 'chat',
          conversationId: r.conversationId,
          userId: r.userId,
          durationMs: Number(r.durationMs) || 1000,
          audioData: r.audioData || undefined,
          audioUrl: r.audioUrl || undefined,
          authorName: r.authorName || undefined,
          createdAt: Number(r.createdAt) || Date.now(),
        }));
      } catch (err) {
        this.logger.warn(`Postgres getChatSounds error, reading from memory cache: ${String(err)}`);
      }
    }

    return this.memoryChatSounds.get(conversationId) || [];
  }

  async createChatSound(
    conversationId: string,
    userId: string,
    authorName: string,
    dto: CreateSoundboardDto,
  ): Promise<SoundboardItemDto> {
    await this.convsService.assertMember(conversationId, userId);

    const id = `chat_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const now = Date.now();
    const item: SoundboardItemDto = {
      id,
      name: dto.name.trim(),
      emoji: dto.emoji.trim() || '🔊',
      scope: 'chat',
      conversationId,
      userId,
      durationMs: dto.durationMs || 1000,
      audioData: dto.audioData || undefined,
      audioUrl: dto.audioUrl || undefined,
      authorName,
      createdAt: now,
    };

    if (this.isTableInitialized) {
      try {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO soundboard_sounds (id, name, emoji, scope, conversation_id, user_id, duration_ms, audio_data, audio_url, author_name, created_at)
           VALUES ($1, $2, $3, 'chat', $4, $5, $6, $7, $8, $9, NOW());`,
          item.id,
          item.name,
          item.emoji,
          conversationId,
          userId,
          item.durationMs,
          item.audioData || null,
          item.audioUrl || null,
          item.authorName || null,
        );
      } catch (err) {
        this.logger.warn(`Failed to insert chat sound into soundboard_sounds: ${String(err)}`);
      }
    }

    const existing = this.memoryChatSounds.get(conversationId) || [];
    this.memoryChatSounds.set(conversationId, [item, ...existing]);

    return item;
  }

  async deleteChatSound(
    conversationId: string,
    id: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    await this.convsService.assertMember(conversationId, userId);

    if (this.isTableInitialized) {
      try {
        await this.prisma.$executeRawUnsafe(
          `DELETE FROM soundboard_sounds WHERE id = $1 AND conversation_id = $2;`,
          id,
          conversationId,
        );
      } catch (err) {
        this.logger.warn(`Failed to delete chat sound from soundboard_sounds: ${String(err)}`);
      }
    }

    const existing = this.memoryChatSounds.get(conversationId) || [];
    this.memoryChatSounds.set(
      conversationId,
      existing.filter((s) => s.id !== id),
    );

    return { success: true };
  }
}
