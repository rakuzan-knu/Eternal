import { describe, expect, it, vi } from 'vitest';
vi.mock('@/shared/api/client', () => ({ getMobileApi: vi.fn() }));
import { addRecentSearch, parseRecentSearches, searchKeys, searchPostRequest } from './search';
import { feedKeys } from '../../feed/model/queries';

describe('mobile Search contracts', () => {
  it('uses explore for empty input and sends one-character Unicode searches', () => {
    expect(searchPostRequest('   ', true).path).toBe('/posts/explore');
    expect(searchPostRequest(' я ', false)).toEqual({
      path: '/posts/search',
      params: { q: 'я', limit: 10, after: undefined, mediaOnly: false },
    });
  });
  it('encodes hashtag segments without # and preserves the cursor', () => {
    expect(searchPostRequest('#дизайн/мрії', true, 'cursor')).toEqual({
      path: '/posts/hashtag/%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%2F%D0%BC%D1%80%D1%96%D1%97',
      params: { after: 'cursor', limit: 18 },
    });
    expect(searchPostRequest('#', true).path).toBe('/posts/search');
    expect(searchPostRequest('#photo', false).params).toHaveProperty('q', '#photo');
  });
  it('keeps search post pages under the Feed action cache boundary and isolates accounts', () => {
    expect(searchKeys.posts('a', 'x', true).slice(0, feedKeys.feeds('a').length)).toEqual(
      feedKeys.feeds('a'),
    );
    expect(searchKeys.people('a', 'x')).not.toEqual(searchKeys.people('b', 'x'));
    expect(searchKeys.posts('a', 'x', true)).not.toEqual(searchKeys.posts('a', 'y', true));
  });
  it('validates and bounds stored recents, deduplicating case-insensitively', () => {
    expect(parseRecentSearches('{broken')).toEqual([]);
    expect(parseRecentSearches('["photo",5,null,"",{}]')).toEqual(['photo']);
    expect(addRecentSearch(['Photo', 'design'], ' photo ')).toEqual(['photo', 'design']);
    expect(
      addRecentSearch(
        Array.from({ length: 20 }, (_, i) => String(i)),
        'new',
      ),
    ).toHaveLength(10);
    expect(addRecentSearch(['photo'], ' ')).toEqual(['photo']);
  });
});
