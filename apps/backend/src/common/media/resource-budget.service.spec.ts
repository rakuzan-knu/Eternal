import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { RedisService } from '../../redis/redis.service';
import { ResourceUsageRepository } from './resource-usage.repository';
import { ResourceBudgetService } from './resource-budget.service';

describe('resource quota diagnostics ownership', () => {
  let service: ResourceBudgetService;
  const databaseBytes = vi.fn().mockResolvedValue(400_000_000);
  const info = vi.fn(async (section: string) =>
    section === 'memory' ? 'used_memory:24\r\nmaxmemory:30\r\n' : 'connected_clients:26\r\n',
  );
  const getClient = vi.fn(() => ({ status: 'ready', info }));
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SERVICE_ROLE', 'core');
    vi.stubEnv('BACKGROUND_ENABLED', 'true');
    const module = await Test.createTestingModule({
      providers: [
        ResourceBudgetService,
        { provide: ResourceUsageRepository, useValue: { databaseBytes } },
        { provide: RedisService, useValue: { getClient } },
      ],
    }).compile();
    service = module.get(ResourceBudgetService);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  it('never probes from a non-owner or a background-disabled Core', async () => {
    vi.stubEnv('SERVICE_ROLE', 'music');
    await service.check();
    vi.stubEnv('SERVICE_ROLE', 'core');
    vi.stubEnv('BACKGROUND_ENABLED', 'false');
    await service.check();
    expect(databaseBytes).not.toHaveBeenCalled();
    expect(getClient).not.toHaveBeenCalled();
  });
  it('warns at storage, memory and connection headroom thresholds using the existing client', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    await service.check();
    expect(databaseBytes).toHaveBeenCalledTimes(1);
    expect(getClient).toHaveBeenCalledTimes(1);
    expect(info.mock.calls.map(([section]) => section)).toEqual(['memory', 'clients']);
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ resource: 'postgres' }));
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ resource: 'redis' }));
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ resource: 'redis-connections' }));
  });
});
