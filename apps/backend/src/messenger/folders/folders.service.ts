import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  FOLDERS_REPOSITORY,
  type ChatFolder,
  type IFoldersRepository,
} from '../interfaces/folders-repository.interface';
import type {
  CreateFolderDto,
  UpdateFolderDto,
  ReorderFoldersDto,
  ChatFolderView,
} from '@common/contracts';

@Injectable()
export class FoldersService {
  constructor(
    @Inject(FOLDERS_REPOSITORY)
    private readonly foldersRepo: IFoldersRepository,
  ) {}

  private mapFolder(folder: ChatFolder): ChatFolderView {
    return {
      id: folder.id,
      userId: folder.userId,
      name: folder.name,
      icon: folder.icon,
      emoji: folder.emoji,
      color: folder.color,
      order: folder.order,
      filterType: folder.filterType,
      includeIds: folder.includeIds,
      excludeIds: folder.excludeIds,
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  }

  async getFolders(userId: string): Promise<ChatFolderView[]> {
    const existing = await this.foldersRepo.findAllByUserId(userId);
    if (existing.length > 0) {
      const cleaned: ChatFolder[] = [];
      for (const f of existing) {
        if (f.filterType === 'WORK' || f.name.toLowerCase() === 'work') {
          await this.foldersRepo.delete(f.id, userId);
        } else {
          if (f.filterType === 'PERSONAL' && (f.emoji || f.icon !== 'User')) {
            const updated = await this.foldersRepo.update(f.id, userId, {
              emoji: null,
              icon: 'User',
            });
            cleaned.push(updated);
          } else if (f.filterType === 'GROUPS' && (f.emoji || f.icon !== 'Users')) {
            const updated = await this.foldersRepo.update(f.id, userId, {
              emoji: null,
              icon: 'Users',
            });
            cleaned.push(updated);
          } else if (f.filterType === 'UNREAD' && (f.emoji || f.icon !== 'BellRing')) {
            const updated = await this.foldersRepo.update(f.id, userId, {
              emoji: null,
              icon: 'BellRing',
            });
            cleaned.push(updated);
          } else if (f.filterType === 'ALL' && (f.emoji || f.icon !== 'MessageSquare')) {
            const updated = await this.foldersRepo.update(f.id, userId, {
              emoji: null,
              icon: 'MessageSquare',
            });
            cleaned.push(updated);
          } else {
            cleaned.push(f);
          }
        }
      }
      return cleaned.map((f) => this.mapFolder(f));
    }

    // Seed default Enterprise folders on first access (Work removed, emojis removed)
    const defaults: CreateFolderDto[] = [
      {
        name: 'All Chats',
        icon: 'MessageSquare',
        color: '#8b5cf6',
        filterType: 'ALL',
        includeIds: [],
        excludeIds: [],
      },
      {
        name: 'Personal',
        icon: 'User',
        color: '#3b82f6',
        filterType: 'PERSONAL',
        includeIds: [],
        excludeIds: [],
      },
      {
        name: 'Groups',
        icon: 'Users',
        color: '#f59e0b',
        filterType: 'GROUPS',
        includeIds: [],
        excludeIds: [],
      },
      {
        name: 'Unread',
        icon: 'BellRing',
        color: '#ec4899',
        filterType: 'UNREAD',
        includeIds: [],
        excludeIds: [],
      },
    ];

    const created: ChatFolder[] = [];
    for (let i = 0; i < defaults.length; i++) {
      const f = await this.foldersRepo.create(userId, defaults[i], i);
      created.push(f);
    }

    return created.map((f) => this.mapFolder(f));
  }

  async createFolder(userId: string, dto: CreateFolderDto): Promise<ChatFolderView> {
    const count = await this.foldersRepo.countForUser(userId);
    const folder = await this.foldersRepo.create(userId, dto, count);
    return this.mapFolder(folder);
  }

  async updateFolder(id: string, userId: string, dto: UpdateFolderDto): Promise<ChatFolderView> {
    const folder = await this.foldersRepo.findById(id, userId);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    const updated = await this.foldersRepo.update(id, userId, dto);
    return this.mapFolder(updated);
  }

  async deleteFolder(id: string, userId: string): Promise<void> {
    const folder = await this.foldersRepo.findById(id, userId);
    if (!folder) {
      throw new NotFoundException('Folder not found');
    }
    await this.foldersRepo.delete(id, userId);
  }

  async reorderFolders(userId: string, dto: ReorderFoldersDto): Promise<ChatFolderView[]> {
    await this.foldersRepo.reorder(userId, dto.folderIds);
    return this.getFolders(userId);
  }
}
