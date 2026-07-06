import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IAvatarRepository, AvatarView } from '../interfaces/avatars-repository.interface';

@Injectable()
export class PrismaAvatarRepository implements IAvatarRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<AvatarView | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, avatar: true },
    });
  }

  async updateAvatar(userId: string, avatar: string | null): Promise<AvatarView> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatar },
      select: { id: true, avatar: true },
    });
  }
}
