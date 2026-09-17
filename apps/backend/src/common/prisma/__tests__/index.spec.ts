import { PrismaModule, PrismaService } from '../index';

describe('prisma barrel exports (index.ts)', () => {
  it('should export PrismaModule and PrismaService', () => {
    expect(PrismaModule).toBeDefined();
    expect(PrismaService).toBeDefined();
  });
});
