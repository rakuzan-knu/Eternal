import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SearchController } from '../search.controller';
import { UsersService } from '../users.service';

describe('SearchController', () => {
  let controller: SearchController;
  let usersService: { searchUsers: jest.Mock };

  beforeEach(async () => {
    usersService = {
      searchUsers: jest.fn().mockResolvedValue([
        {
          id: '1',
          username: 'alex',
          displayName: 'Alex Smith',
          bio: 'Frontend developer',
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  it('returns empty results when query is empty or whitespace', async () => {
    const res = await controller.getSuggestions('   ');
    expect(res).toEqual(['', [], [], []]);
    expect(usersService.searchUsers).not.toHaveBeenCalled();
  });

  it('sanitizes input and returns suggestions array', async () => {
    const res = await controller.getSuggestions('<script>alert("xss")</script>alex');
    expect(res[0]).toBe('alex');
    expect(res[1]).toEqual(['@alex (Alex Smith)']);
    expect(res[2]).toEqual(['Frontend developer']);
    expect(res[3][0]).toContain('/@alex');
  });
});
