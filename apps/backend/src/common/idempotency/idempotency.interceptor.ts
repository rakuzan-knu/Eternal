import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { RedisService } from '../../redis/redis.service';
import { safeJsonParse } from '../utils/json.util';
import {
  DEFAULT_IDEMPOTENCY_TTL_SECONDS,
  HEADER_CACHE_LOOKUP,
  HEADER_IDEMPOTENCY_KEY,
  HEADER_IDEMPOTENT_REPLAY,
  IDEMPOTENCY_STATE,
  IDEMPOTENT_METADATA_KEY,
  IN_FLIGHT_LOCK_TTL_MS,
  REDIS_IDEMPOTENCY_PREFIX,
  type IdempotencyRecord,
} from './idempotency.constants';
import type { IdempotentOptions } from './idempotency.decorator';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request & { user?: { id?: string } }>();
    const res = http.getResponse<Response>();

    const method = (req.method || '').toUpperCase();
    const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    const decoratorOptions = this.reflector.getAllAndOverride<IdempotentOptions | undefined>(
      IDEMPOTENT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    const rawHeader = req.headers[HEADER_IDEMPOTENCY_KEY];
    const rawKey = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    const idempotencyKey = typeof rawKey === 'string' ? rawKey.trim() : undefined;

    if (!idempotencyKey) {
      if (decoratorOptions?.required) {
        throw new BadRequestException(
          `Header '${HEADER_IDEMPOTENCY_KEY}' is required for this operation.`,
        );
      }
      return next.handle();
    }

    if (!isMutatingMethod && !decoratorOptions) {
      return next.handle();
    }

    if (idempotencyKey.length > 256) {
      throw new BadRequestException('Idempotency key exceeds maximum length of 256 characters.');
    }

    const clientIdentifier =
      req.user?.id ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'anonymous';

    const redisKey = `${REDIS_IDEMPOTENCY_PREFIX}${clientIdentifier}:${idempotencyKey}`;
    const ttlSeconds = decoratorOptions?.ttlSeconds ?? DEFAULT_IDEMPOTENCY_TTL_SECONDS;
    const redisClient = this.redisService.getClient();

    // 1. Check existing record in Redis
    try {
      const existingRaw = await this.redisService.get(redisKey);
      if (existingRaw) {
        const record = safeJsonParse<IdempotencyRecord>(existingRaw);
        if (record) {
          if (record.state === IDEMPOTENCY_STATE.COMPLETED) {
            if (record.statusCode) {
              if (typeof res.status === 'function') {
                res.status(record.statusCode);
              } else {
                res.statusCode = record.statusCode;
              }
            }
            if (typeof res.setHeader === 'function') {
              res.setHeader(HEADER_IDEMPOTENT_REPLAY, 'true');
              res.setHeader(HEADER_CACHE_LOOKUP, 'HIT');
            } else if (
              typeof (res as { header?: (k: string, v: string) => void }).header === 'function'
            ) {
              (res as { header: (k: string, v: string) => void }).header(
                HEADER_IDEMPOTENT_REPLAY,
                'true',
              );
              (res as { header: (k: string, v: string) => void }).header(
                HEADER_CACHE_LOOKUP,
                'HIT',
              );
            }
            return of(record.body);
          }

          if (record.state === IDEMPOTENCY_STATE.IN_PROGRESS) {
            throw new ConflictException(
              `A request with idempotency key "${idempotencyKey}" is currently being processed.`,
            );
          }
        }
      }
    } catch (err) {
      if (err instanceof ConflictException || err instanceof BadRequestException) {
        throw err;
      }
      this.logger.warn(`Failed reading idempotency key from Redis: ${String(err)}`);
    }

    // 2. Set IN_PROGRESS lock atomically using NX
    try {
      const inProgressPayload: IdempotencyRecord = {
        state: IDEMPOTENCY_STATE.IN_PROGRESS,
        timestamp: Date.now(),
      };
      const acquired = await redisClient.set(
        redisKey,
        JSON.stringify(inProgressPayload),
        'PX',
        IN_FLIGHT_LOCK_TTL_MS,
        'NX',
      );

      if (acquired !== 'OK') {
        throw new ConflictException(
          `A request with idempotency key "${idempotencyKey}" is currently being processed.`,
        );
      }
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      this.logger.warn(`Failed acquiring in-flight idempotency lock in Redis: ${String(err)}`);
    }

    // 3. Execute request and cache the result
    return next.handle().pipe(
      tap((responseBody) => {
        void (async () => {
          try {
            const completedRecord: IdempotencyRecord = {
              state: IDEMPOTENCY_STATE.COMPLETED,
              statusCode: res.statusCode || 200,
              body: responseBody,
              timestamp: Date.now(),
            };
            await this.redisService.set(redisKey, JSON.stringify(completedRecord), ttlSeconds);
          } catch (err) {
            this.logger.warn(`Failed saving completed idempotency record to Redis: ${String(err)}`);
          }
        })();
      }),
      catchError((error: unknown) => {
        // If the execution failed with an error, delete in-flight lock to allow immediate retries
        void this.redisService.del(redisKey).catch(() => {});
        return throwError(() => error);
      }),
    );
  }
}
