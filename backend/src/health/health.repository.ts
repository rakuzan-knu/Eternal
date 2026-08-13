import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface IHealthRepository {
  pingDatabase(): Promise<boolean>;
}

@Injectable()
export class HealthRepository implements IHealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async pingDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
