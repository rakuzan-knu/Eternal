import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { IdempotencyInterceptor } from '../idempotency.interceptor';
import { RedisService } from '../../../redis/redis.service';
import { Reflector } from '@nestjs/core';
import { ConflictException } from '@nestjs/common';
import type { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import {
  HEADER_IDEMPOTENCY_KEY,
  HEADER_IDEMPOTENT_REPLAY,
  HEADER_CACHE_LOOKUP,
  IDEMPOTENCY_STATE,
} from '../idempotency.constants';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let mockRedisClient: {
    set: jest.Mock;
    get: jest.Mock;
    del: jest.Mock;
  };
  let mockRedisService: Partial<RedisService>;
  let mockReflector: Partial<Reflector>;

  beforeEach(async () => {
    mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      get: mockRedisClient.get,
      set: mockRedisClient.set,
      del: mockRedisClient.del,
    };

    mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyInterceptor,
        { provide: RedisService, useValue: mockRedisService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
  });

  const createMockContext = (
    method: string,
    headers: Record<string, string>,
    user?: { id: string },
  ) => {
    const req = {
      method,
      headers,
      user,
      ip: '127.0.0.1',
    };
    const res = {
      statusCode: 200,
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    return {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('passes through if no idempotency key is present on non-required endpoint', async () => {
    const context = createMockContext('POST', {});
    const handler: CallHandler = {
      handle: () => of({ success: true }),
    };

    const result = await interceptor.intercept(context, handler);
    let emitted: unknown;
    result.subscribe((val) => (emitted = val));

    expect(emitted).toEqual({ success: true });
    expect(mockRedisClient.get).not.toHaveBeenCalled();
  });

  it('returns cached response directly on replay', async () => {
    const cachedRecord = {
      state: IDEMPOTENCY_STATE.COMPLETED,
      statusCode: 201,
      body: { id: 'created-item-123' },
    };
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(cachedRecord));

    const context = createMockContext(
      'POST',
      { [HEADER_IDEMPOTENCY_KEY]: 'key-123' },
      { id: 'usr-1' },
    );
    const handler: CallHandler = {
      handle: jest.fn(),
    };

    const result = await interceptor.intercept(context, handler);
    let emitted: unknown;
    result.subscribe((val) => (emitted = val));

    expect(emitted).toEqual({ id: 'created-item-123' });
    expect(handler.handle).not.toHaveBeenCalled();
    const res = context.switchToHttp().getResponse<{ setHeader: jest.Mock }>();
    expect(res.setHeader).toHaveBeenCalledWith(HEADER_IDEMPOTENT_REPLAY, 'true');
    expect(res.setHeader).toHaveBeenCalledWith(HEADER_CACHE_LOOKUP, 'HIT');
  });

  it('throws 409 Conflict if duplicate request is IN_PROGRESS', async () => {
    const inProgressRecord = {
      state: IDEMPOTENCY_STATE.IN_PROGRESS,
    };
    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(inProgressRecord));

    const context = createMockContext('POST', { [HEADER_IDEMPOTENCY_KEY]: 'key-123' });
    const handler: CallHandler = {
      handle: () => of({ success: true }),
    };

    await expect(interceptor.intercept(context, handler)).rejects.toThrow(ConflictException);
  });
});
