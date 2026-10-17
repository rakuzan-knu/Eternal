import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { RedisService } from '../../redis/redis.service';

const RESERVE = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local amount = tonumber(ARGV[1])
if current + amount > tonumber(ARGV[2]) then return 0 end
redis.call('INCRBY', KEYS[1], amount)
return 1`;

export const MAX_PUBLIC_IDENTITIES = 40_000;

@Injectable()
export class PublicSearchService {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  private settings() {
    const app = this.config.get<string>('ALGOLIA_APPLICATION_ID') ?? '';
    const key = this.config.get<string>('ALGOLIA_API_KEY') ?? '';
    const index = this.config.get<string>('ALGOLIA_PUBLIC_USERS_INDEX') ?? '';
    if (!/^[A-Za-z0-9]+$/.test(app) || !key || !/^[A-Za-z0-9_-]{1,100}$/.test(index)) {
      throw new Error('Public search configuration incomplete');
    }
    return { app, key, index };
  }

  private async reserve(kind: 'requests' | 'writes', amount: number): Promise<void> {
    const { app } = this.settings();
    const maximum = kind === 'requests' ? 9000 : 45_000;
    const configured = Number(
      this.config.get<string>(`PUBLIC_SEARCH_MONTHLY_${kind.toUpperCase()}_LIMIT`) ?? maximum,
    );
    if (!Number.isSafeInteger(configured) || configured < 1 || configured > maximum) {
      throw new Error('Public search budget invalid');
    }
    const client = this.redis.getClient();
    if (client.status !== 'ready') throw new Error('Public search budget unavailable');
    const scope = createHash('sha256').update(app).digest('hex').slice(0, 16);
    const month = new Date().toISOString().slice(0, 7);
    const reserved = await client.eval(
      RESERVE,
      1,
      `public-search:${scope}:${month}:${kind}`,
      amount,
      configured,
    );
    if (reserved !== 1) throw new Error('Public search budget exhausted');
  }

  private async request(path: string, body?: unknown): Promise<unknown> {
    const { app, key, index } = this.settings();
    await this.reserve('requests', 1);
    const response = await fetch(
      `https://${app}.algolia.net/1/indexes/${encodeURIComponent(index)}${path}`,
      {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Algolia-Application-Id': app,
          'X-Algolia-API-Key': key,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!response.ok) throw new Error('Public search provider request failed');
    return response.json();
  }

  /** null explicitly means use the legacy PostgreSQL candidate source. */
  async candidates(term: string): Promise<string[] | null> {
    if (this.config.get<string>('PUBLIC_SEARCH_PROVIDER') !== 'algolia') return null;
    try {
      const data = await this.request('/query', {
        query: term.slice(0, 64),
        hitsPerPage: 60,
        attributesToRetrieve: ['objectID'],
        attributesToHighlight: [],
        analytics: false,
        clickAnalytics: false,
        restrictSearchableAttributes: ['username', 'displayName'],
      });
      if (!data || typeof data !== 'object' || !('hits' in data) || !Array.isArray(data.hits))
        return null;
      return data.hits
        .flatMap((hit: unknown) =>
          hit && typeof hit === 'object' && 'objectID' in hit && typeof hit.objectID === 'string'
            ? [hit.objectID.slice(0, 100)]
            : [],
        )
        .slice(0, 60);
    } catch {
      // Do not log queries, credentials or provider error bodies.
      return null;
    }
  }

  async syncIdentity(
    id: string,
    identity: { username: string; displayName: string | null } | null,
  ): Promise<void> {
    if (identity) {
      const result = await this.request('/query', { query: '', hitsPerPage: 0, analytics: false });
      if (
        !result ||
        typeof result !== 'object' ||
        !('nbHits' in result) ||
        typeof result.nbHits !== 'number' ||
        result.nbHits > MAX_PUBLIC_IDENTITIES
      ) {
        throw new Error('Public search record ceiling reached');
      }
      if (result.nbHits === MAX_PUBLIC_IDENTITIES) {
        const existing = await this.request(`/${encodeURIComponent(id)}`);
        if (
          !existing ||
          typeof existing !== 'object' ||
          !('objectID' in existing) ||
          existing.objectID !== id
        )
          throw new Error('Public search record ceiling reached');
      }
    }
    await this.reserve('writes', 1);
    await this.waitForTask(
      await this.request('/batch', {
        requests: [
          {
            action: identity ? 'addObject' : 'deleteObject',
            body: identity
              ? { objectID: id, username: identity.username, displayName: identity.displayName }
              : { objectID: id },
          },
        ],
      }),
    );
  }

  async rebuild(
    records: { objectID: string; username: string; displayName: string | null }[],
  ): Promise<void> {
    if (records.length > MAX_PUBLIC_IDENTITIES)
      throw new Error('Public search record ceiling exceeded');
    await this.reserve('writes', records.length + 1);
    await this.waitForTask(await this.request('/clear', {}));
    for (let offset = 0; offset < records.length; offset += 100) {
      const requests = records
        .slice(offset, offset + 100)
        .map(({ objectID, username, displayName }) => ({
          action: 'addObject',
          body: { objectID, username, displayName },
        }));
      await this.waitForTask(await this.request('/batch', { requests }));
    }
  }

  private async waitForTask(result: unknown): Promise<void> {
    if (
      !result ||
      typeof result !== 'object' ||
      !('taskID' in result) ||
      typeof result.taskID !== 'number'
    ) {
      throw new Error('Public search task response invalid');
    }
    for (let attempt = 0; attempt < 10; attempt++) {
      const task = await this.request(`/task/${result.taskID}`);
      if (task && typeof task === 'object' && 'status' in task && task.status === 'published')
        return;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error('Public search task did not complete');
  }
}
