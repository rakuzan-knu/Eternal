import { Injectable } from '@nestjs/common';
import { PrismaService } from '@common/prisma';
import type { IFoldersRepository, ChatFolder } from '../interfaces/folders-repository.interface';
import type { CreateFolderDto, UpdateFolderDto } from '@common/contracts';

@Injectable()
export class FoldersRepository implements IFoldersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllByUserId(userId: string): Promise<ChatFolder[]> {
    return this.prisma.chatFolder.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });
  }

  findById(id: string, userId: string): Promise<ChatFolder | null> {
    return this.prisma.chatFolder.findFirst({
      where: { id, userId },
    });
  }

  create(userId: string, data: CreateFolderDto, order: number): Promise<ChatFolder> {
    return this.prisma.chatFolder.create({
      data: {
        userId,
        name: data.name,
        icon: data.icon ?? null,
        emoji: data.emoji ?? null,
        color: data.color ?? '#8b5cf6',
        filterType: data.filterType,
        includeIds: data.includeIds ?? [],
        excludeIds: data.excludeIds ?? [],
        order,
      },
    });
  }

  update(id: string, userId: string, data: UpdateFolderDto): Promise<ChatFolder> {
    return this.prisma.chatFolder.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.emoji !== undefined && { emoji: data.emoji }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.filterType !== undefined && { filterType: data.filterType }),
        ...(data.includeIds !== undefined && { includeIds: data.includeIds }),
        ...(data.excludeIds !== undefined && { excludeIds: data.excludeIds }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  async delete(id: string, _userId: string): Promise<void> {
    await this.prisma.chatFolder.delete({
      where: { id },
    });
  }

  async reorder(userId: string, folderIds: string[]): Promise<void> {
    await this.prisma.$transaction(
      folderIds.map((id, index) =>
        this.prisma.chatFolder.updateMany({
          where: { id, userId },
          data: { order: index },
        }),
      ),
    );
  }

  countForUser(userId: string): Promise<number> {
    return this.prisma.chatFolder.count({
      where: { userId },
    });
  }
}
