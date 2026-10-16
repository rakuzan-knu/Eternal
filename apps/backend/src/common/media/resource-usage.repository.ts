import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResourceUsageRepository {
  constructor(private readonly prisma: PrismaService) {}
  async databaseBytes(): Promise<number> {
    const rows = await this.prisma.$queryRaw<
      Array<{ bytes: bigint }>
    >`SELECT pg_database_size(current_database()) AS bytes`;
    return Number(rows[0]?.bytes ?? 0n);
  }
}
