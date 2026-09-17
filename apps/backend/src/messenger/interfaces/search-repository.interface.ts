import type { GlobalSearchDto, GlobalSearchResult } from '@common/contracts';

export const SEARCH_REPOSITORY = Symbol('SEARCH_REPOSITORY');

export interface ISearchRepository {
  searchGlobal(userId: string, dto: GlobalSearchDto): Promise<GlobalSearchResult>;
}
