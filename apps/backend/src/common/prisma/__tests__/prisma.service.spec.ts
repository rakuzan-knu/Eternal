import { PrismaService, createPgPool } from '../prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;
  let connectSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new PrismaService();
    connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('connects to database onModuleInit', async () => {
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('creates pg Pool with pool configuration parameters', () => {
    const raw = 'postgresql://user:pass@localhost:5432/testdb';
    const pool = createPgPool(raw, {
      poolLimit: 15,
      poolTimeout: 5,
      connectTimeout: 7,
      statementTimeout: 8000,
      queryTimeout: 8000,
    });
    expect(pool).toBeDefined();
    expect(pool?.options.max).toBe(15);
    expect(pool?.options.idleTimeoutMillis).toBe(5000);
    expect(pool?.options.connectionTimeoutMillis).toBe(7000);
    expect(pool?.options.statement_timeout).toBe(8000);
    expect(pool?.options.query_timeout).toBe(8000);
    void pool?.end();
  });

  it('returns undefined if no raw url is provided', () => {
    expect(createPgPool(undefined)).toBeUndefined();
  });

  it('returns pool metrics or null if pool is not initialized', () => {
    (service as unknown as { pool?: unknown }).pool = undefined;
    expect(service.getPoolMetrics()).toBeNull();

    (
      service as unknown as {
        pool: { totalCount: number; idleCount: number; waitingCount: number };
      }
    ).pool = {
      totalCount: 10,
      idleCount: 7,
      waitingCount: 2,
    };

    const metrics = service.getPoolMetrics();
    expect(metrics).toEqual({
      total: 10,
      idle: 7,
      active: 3,
      waiting: 2,
    });
  });

  it('disconnects and terminates pool onModuleDestroy', async () => {
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
