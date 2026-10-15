import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SoundboardController } from '../soundboard.controller';
import type { SoundboardService } from '../soundboard.service';
import type { MessengerGateway } from '../../gateway/messenger.gateway';

describe('SoundboardController', () => {
  let controller: SoundboardController;
  let mockService: any;
  let mockGateway: any;

  const mockUser: any = {
    id: 'user-alice',
    username: 'alice',
  };

  beforeEach(() => {
    mockService = {
      getMySounds: vi.fn().mockResolvedValue([]),
      createMySound: vi.fn().mockResolvedValue({ id: 'my-1', name: 'Meme' }),
      deleteMySound: vi.fn().mockResolvedValue({ success: true }),
      getChatSounds: vi.fn().mockResolvedValue([]),
      createChatSound: vi.fn().mockResolvedValue({ id: 'chat-1', name: 'ChatMeme' }),
      deleteChatSound: vi.fn().mockResolvedValue({ success: true }),
    };

    mockGateway = {
      broadcastChatSoundAdded: vi.fn(),
      broadcastChatSoundDeleted: vi.fn(),
    };

    controller = new SoundboardController(mockService, mockGateway);
  });

  it('delegates getMySounds to service with user id', async () => {
    await controller.getMySounds(mockUser);
    expect(mockService.getMySounds).toHaveBeenCalledWith('user-alice');
  });

  it('delegates createMySound to service with user info', async () => {
    await controller.createMySound(mockUser, {
      name: 'Airhorn',
      emoji: '📯',
      durationMs: 1500,
    });
    expect(mockService.createMySound).toHaveBeenCalledWith('user-alice', 'alice', {
      name: 'Airhorn',
      emoji: '📯',
      durationMs: 1500,
    });
  });

  it('delegates deleteMySound to service', async () => {
    const res = await controller.deleteMySound(mockUser, 'my-123');
    expect(mockService.deleteMySound).toHaveBeenCalledWith('user-alice', 'my-123');
    expect(res).toEqual({ success: true });
  });

  it('delegates createChatSound and broadcasts to gateway', async () => {
    const item = await controller.createChatSound(mockUser, 'conv-999', {
      name: 'Bruh',
      emoji: '🗿',
    });
    expect(mockService.createChatSound).toHaveBeenCalledWith('conv-999', 'user-alice', 'alice', {
      name: 'Bruh',
      emoji: '🗿',
    });
    expect(mockGateway.broadcastChatSoundAdded).toHaveBeenCalledWith('conv-999', item);
  });

  it('delegates deleteChatSound and broadcasts deletion to gateway', async () => {
    const res = await controller.deleteChatSound(mockUser, 'conv-999', 'chat-888');
    expect(mockService.deleteChatSound).toHaveBeenCalledWith('conv-999', 'chat-888', 'user-alice');
    expect(mockGateway.broadcastChatSoundDeleted).toHaveBeenCalledWith('conv-999', 'chat-888');
    expect(res).toEqual({ success: true });
  });
});
