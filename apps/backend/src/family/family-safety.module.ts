import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma';
import { FamilySafeguardService } from './family-safeguard.service';

@Module({
  imports: [PrismaModule],
  providers: [FamilySafeguardService],
  exports: [FamilySafeguardService],
})
export class FamilySafetyModule {}
