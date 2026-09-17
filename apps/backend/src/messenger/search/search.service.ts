import { Inject, Injectable } from '@nestjs/common';
import {
  SEARCH_REPOSITORY,
  type ISearchRepository,
} from '../interfaces/search-repository.interface';
import type { GlobalSearchDto, GlobalSearchResult } from '@common/contracts';

@Injectable()
export class SearchService {
  constructor(
    @Inject(SEARCH_REPOSITORY)
    private readonly searchRepo: ISearchRepository,
  ) {}

  search(userId: string, dto: GlobalSearchDto): Promise<GlobalSearchResult> {
    return this.searchRepo.searchGlobal(userId, dto);
  }
}
