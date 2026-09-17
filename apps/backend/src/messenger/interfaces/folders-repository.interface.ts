import type { CreateFolderDto, UpdateFolderDto } from '@common/contracts';

export const FOLDERS_REPOSITORY = Symbol('FOLDERS_REPOSITORY');

export interface ChatFolder {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  emoji: string | null;
  color: string;
  order: number;
  filterType: 'ALL' | 'PERSONAL' | 'WORK' | 'GROUPS' | 'CHANNELS' | 'UNREAD' | 'CUSTOM';
  includeIds: string[];
  excludeIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IFoldersRepository {
  findAllByUserId(userId: string): Promise<ChatFolder[]>;
  findById(id: string, userId: string): Promise<ChatFolder | null>;
  create(userId: string, data: CreateFolderDto, order: number): Promise<ChatFolder>;
  update(id: string, userId: string, data: UpdateFolderDto): Promise<ChatFolder>;
  delete(id: string, userId: string): Promise<void>;
  reorder(userId: string, folderIds: string[]): Promise<void>;
  countForUser(userId: string): Promise<number>;
}
