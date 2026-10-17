import { vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../redis/redis.service';
import { PublicSearchService, MAX_PUBLIC_IDENTITIES } from '../public-search.service';

const settings = {
  PUBLIC_SEARCH_PROVIDER: 'algolia',
  ALGOLIA_APPLICATION_ID: 'example',
  ALGOLIA_API_KEY: 'test-secret',
  ALGOLIA_PUBLIC_USERS_INDEX: 'public_users',
};

function requestJson(body: unknown): unknown {
  if (typeof body !== 'string') throw new Error('Expected a JSON request body');
  return JSON.parse(body);
}

describe('PublicSearchService', () => {
  const client = { status: 'ready', eval: jest.fn() };
  const fetchMock = vi.fn<typeof fetch>();
  let service: PublicSearchService;
  let config: ConfigService;
  beforeEach(async () => {
    jest.clearAllMocks();
    client.status = 'ready';
    client.eval.mockResolvedValue(1);
    config = new ConfigService({ ...settings });
    const module = await Test.createTestingModule({
      providers: [
        PublicSearchService,
        { provide: ConfigService, useValue: config },
        { provide: RedisService, useValue: { getClient: () => client } },
      ],
    }).compile();
    service = module.get(PublicSearchService);
    jest.spyOn(globalThis, 'fetch').mockImplementation(fetchMock);
  });
  afterEach(() => jest.restoreAllMocks());

  it('uses provider IDs only and sends no viewer identity', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ hits: [{ objectID: 'u-1' }] })));
    await expect(service.candidates('alex')).resolves.toEqual(['u-1']);
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe('https://example.algolia.net/1/indexes/public_users/query');
    expect(requestJson(request?.body)).toMatchObject({
      query: 'alex',
      attributesToRetrieve: ['objectID'],
      analytics: false,
    });
    expect(client.eval).toHaveBeenCalledTimes(1);
  });
  it('preserves empty results without triggering legacy search', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ hits: [] })));
    await expect(service.candidates('missing')).resolves.toEqual([]);
  });
  it('uses the official fallback after DNS failure and budgets each attempt', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ hits: [{ objectID: 'u-1' }] })));
    await expect(service.candidates('alex')).resolves.toEqual(['u-1']);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://example-1.algolianet.com/1/indexes/public_users/query',
    );
    expect(client.eval).toHaveBeenCalledTimes(2);
  });
  it('refuses a DNS fallback when its separate reservation is exhausted', async () => {
    client.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    fetchMock.mockRejectedValueOnce(
      new TypeError('fetch failed', { cause: { code: 'EAI_AGAIN' } }),
    );
    await expect(service.candidates('alex')).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('does not replay an ambiguous deletion request', async () => {
    fetchMock.mockRejectedValueOnce(
      new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } }),
    );
    await expect(service.syncIdentity('u-1', null)).rejects.toThrow('fetch failed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('can send a deletion to the fallback after failure before DNS resolution', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ taskID: 9 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'published' })));
    await service.syncIdentity('deleted-user', null);
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://example-1.algolianet.com/1/indexes/public_users/batch',
    );
    expect(fetchMock.mock.calls[1][1]?.body).toBe(fetchMock.mock.calls[0][1]?.body);
    expect(client.eval).toHaveBeenCalledTimes(4); // One write plus three HTTP attempts.
  });
  it.each(['disabled', 'budget', 'redis'])('makes no provider calls when %s', async (failure) => {
    if (failure === 'disabled') config.set('PUBLIC_SEARCH_PROVIDER', 'postgres');
    if (failure === 'budget') client.eval.mockResolvedValue(0);
    if (failure === 'redis') client.status = 'reconnecting';
    await expect(service.candidates('alex')).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('falls back on a provider error or malformed response', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('failure', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ wrong: [] })));
    await expect(service.candidates('alex')).resolves.toBeNull();
    await expect(service.candidates('alex')).resolves.toBeNull();
  });
  it('refuses oversized rebuilds before making external calls', async () => {
    const rows = Array.from({ length: MAX_PUBLIC_IDENTITIES + 1 }, (_, id) => ({
      objectID: String(id),
      username: 'name',
      displayName: null,
    }));
    await expect(service.rebuild(rows)).rejects.toThrow('ceiling');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('reconciles deletions by clearing before writing only public identity fields', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ taskID: 1 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'published' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ taskID: 2 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'published' })));
    await service.rebuild([{ objectID: 'u-1', username: 'alex', displayName: 'Alex' }]);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://example.algolia.net/1/indexes/public_users/clear',
      'https://example.algolia.net/1/indexes/public_users/task/1',
      'https://example.algolia.net/1/indexes/public_users/batch',
      'https://example.algolia.net/1/indexes/public_users/task/2',
    ]);
    expect(requestJson(fetchMock.mock.calls[2]?.[1]?.body)).toEqual({
      requests: [
        { action: 'addObject', body: { objectID: 'u-1', username: 'alex', displayName: 'Alex' } },
      ],
    });
  });

  it('allows updating an existing identity at the record ceiling', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ nbHits: MAX_PUBLIC_IDENTITIES })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ objectID: 'u-1' })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ taskID: 3 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'published' })));
    await expect(
      service.syncIdentity('u-1', { username: 'renamed', displayName: null }),
    ).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://example.algolia.net/1/indexes/public_users/u-1',
    );
  });

  it('allows deletion without a record-count query and waits for publication', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ taskID: 4 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'published' })));
    await service.syncIdentity('deleted-user', null);
    expect(requestJson(fetchMock.mock.calls[0][1]?.body)).toEqual({
      requests: [{ action: 'deleteObject', body: { objectID: 'deleted-user' } }],
    });
  });
});
