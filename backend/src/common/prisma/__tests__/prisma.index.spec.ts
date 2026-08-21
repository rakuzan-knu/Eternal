import * as PrismaIndex from '../index';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';

describe('Prisma barrel index', () => {
  it('exports PrismaModule and PrismaService', () => {
    expect(PrismaIndex.PrismaModule).toBe(PrismaModule);
    expect(PrismaIndex.PrismaService).toBe(PrismaService);
  });
});
