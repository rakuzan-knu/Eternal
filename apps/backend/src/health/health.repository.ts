import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@common/prisma';

export interface IHealthRepository {
  pingDatabase(): Promise<boolean>;
}

@Injectable()
export class HealthRepository implements IHealthRepository {
  private readonly logger = new Logger(HealthRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async pingDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (e) {
      this.logger.warn(`Health check database ping failed: ${String(e)}`);
      return false;
    }
  }
}
