import { PrismaModule } from '../prisma.module';

describe('PrismaModule', () => {
  it('is defined and instantiable', () => {
    const module = new PrismaModule();
    expect(module).toBeDefined();
  });
});
