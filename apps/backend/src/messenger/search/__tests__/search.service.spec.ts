import { SearchService } from '../search.service';
import type { ISearchRepository } from '../../interfaces/search-repository.interface';
import type { GlobalSearchDto, GlobalSearchResult } from '@common/contracts';

describe('SearchService', () => {
  let service: SearchService;
  let mockSearchRepo: jest.Mocked<ISearchRepository>;

  const mockResult: GlobalSearchResult = {
    messages: [
      {
        id: 'm-1',
        conversationId: 'c-1',
        conversationTitle: 'Alice',
        conversationAvatar: null,
        isGroup: false,
        senderId: 'u-2',
        senderName: 'Alice',
        senderAvatar: null,
        body: 'Hello world enterprise message',
        createdAt: new Date().toISOString(),
        highlightSnippet: 'Hello world',
      },
    ],
    media: [],
    people: [],
  };

  beforeEach(() => {
    mockSearchRepo = {
      searchGlobal: jest.fn(),
    };
    service = new SearchService(mockSearchRepo);
  });

  it('delegates searchGlobal to search repository', async () => {
    mockSearchRepo.searchGlobal.mockResolvedValue(mockResult);
    const dto: GlobalSearchDto = {
      q: 'world',
      type: 'all',
      limit: 20,
      offset: 0,
    };

    const res = await service.search('u-1', dto);
    expect(mockSearchRepo.searchGlobal).toHaveBeenCalledWith('u-1', dto);
    expect(res.messages).toHaveLength(1);
    expect(res.messages[0].highlightSnippet).toBe('Hello world');
  });
});
