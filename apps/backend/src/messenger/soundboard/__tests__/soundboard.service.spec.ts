import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoundboardService } from '../soundboard.service';
import type { PrismaService } from '@common/prisma';
import type { ConversationsService } from '../../conversations/conversations.service';

describe('SoundboardService', () => {
  let service: SoundboardService;
  let mockPrisma: any;
  let mockConvsService: any;

  beforeEach(() => {
    mockPrisma = {
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    };
    mockConvsService = {
      assertMember: vi.fn().mockResolvedValue(true),
    };

    service = new SoundboardService(mockPrisma, mockConvsService);
  });

  describe('onModuleInit', () => {
    it('initializes table schema on module init', async () => {
      await service.onModuleInit();
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS soundboard_sounds'),
      );
    });
  });

  describe('My Sounds', () => {
    it('creates and returns custom sound for user', async () => {
      const item = await service.createMySound('user-1', 'Alice', {
        name: 'Victory Horn',
        emoji: '🎺',
        durationMs: 2500,
        audioData: 'data:audio/mp3;base64,AAAA',
      });

      expect(item.id).toMatch(/^my_/);
      expect(item.name).toBe('Victory Horn');
      expect(item.emoji).toBe('🎺');
      expect(item.scope).toBe('my');
      expect(item.userId).toBe('user-1');
      expect(item.authorName).toBe('Alice');
    });

    it('retrieves user sounds from database', async () => {
      await service.onModuleInit();
      mockPrisma.$queryRawUnsafe.mockResolvedValueOnce([
        {
          id: 'my-1',
          name: 'Sound 1',
          emoji: '🦆',
          scope: 'my',
          userId: 'user-1',
          durationMs: 1200,
          audioData: 'data:audio/mp3;base64,BBBB',
          authorName: 'Alice',
          createdAt: 1700000000000,
        },
      ]);

      const sounds = await service.getMySounds('user-1');
      expect(sounds).toHaveLength(1);
      expect(sounds[0]?.name).toBe('Sound 1');
      expect(sounds[0]?.userId).toBe('user-1');
    });

    it('deletes custom sound for user', async () => {
      await service.onModuleInit();
      const res = await service.deleteMySound('user-1', 'my-1');
      expect(res.success).toBe(true);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM soundboard_sounds WHERE id = $1 AND user_id = $2'),
        'my-1',
        'user-1',
      );
    });
  });

  describe('Chat Sounds', () => {
    it('asserts member and creates chat sound', async () => {
      const item = await service.createChatSound('conv-100', 'user-2', 'Bob', {
        name: 'Applause',
        emoji: '👏',
        durationMs: 3000,
      });

      expect(mockConvsService.assertMember).toHaveBeenCalledWith('conv-100', 'user-2');
      expect(item.id).toMatch(/^chat_/);
      expect(item.scope).toBe('chat');
      expect(item.conversationId).toBe('conv-100');
    });

    it('asserts member and deletes chat sound', async () => {
      await service.onModuleInit();
      const res = await service.deleteChatSound('conv-100', 'chat-1', 'user-2');
      expect(mockConvsService.assertMember).toHaveBeenCalledWith('conv-100', 'user-2');
      expect(res.success).toBe(true);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining(
          'DELETE FROM soundboard_sounds WHERE id = $1 AND conversation_id = $2',
        ),
        'chat-1',
        'conv-100',
      );
    });
  });
});
