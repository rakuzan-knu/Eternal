import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma';
import { UsersRepository } from '../../../users/repositories/users.repository';

describe('Public search hydration boundary', () => {
  it('intersects provider IDs with live blocks and reserved names', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [UsersRepository, { provide: PrismaService, useValue: { user: { findMany } } }],
    }).compile();
    await module
      .get(UsersRepository)
      .searchCandidates(['blocked'], ['admin'], 60, ['blocked', 'public']);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { id: { notIn: ['blocked'] } },
            { username: { notIn: ['admin'] } },
            { id: { in: ['blocked', 'public'] } },
          ],
        },
        take: 60,
      }),
    );
    findMany.mockClear();
    await expect(module.get(UsersRepository).searchCandidates([], [], 60, [])).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });
});
