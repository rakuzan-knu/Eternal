import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { JwtStrategy } from '../../../auth/strategies/jwt.strategy';
import { TokenRevocationService } from '../../../auth/token-revocation.service';
import { RedisService } from '../../../redis/redis.service';
import { UsersService } from '../../../users/users.service';
import { VisibilityResolver } from '../../../users/privacy/visibility.resolver';
import { ConversationsService } from '../../conversations/conversations.service';
import { CALLS_REPOSITORY } from '../../interfaces/calls-repository.interface';
import type { ICallsRepository } from '../../interfaces/calls-repository.interface';
import { MESSAGES_REPOSITORY } from '../../interfaces/messages-repository.interface';
import type { IMessagesRepository } from '../../interfaces/messages-repository.interface';
import { CallsController } from '../calls.controller';
import { CallsService } from '../calls.service';
import { CallsStepUpService } from '../calls-step-up.service';

describe('disabled call quality telemetry collection', () => {
  let app: NestFastifyApplication;
  let service: CallsService;
  const calls = { findCallById: vi.fn(), saveTelemetry: vi.fn() };
  const secret = 'synthetic-call-telemetry-test-only';
  const jwt = new JwtService({ secret });
  const payload = { callId: 'synthetic-call', avgRttMs: 10, packetLossRatio: 0, durationMs: 100 };
  const headers = () => ({
    authorization: `Bearer ${jwt.sign({ sub: 'alice', jti: 'session', type: 'access' })}`,
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [CallsController],
      providers: [
        {
          provide: CallsService,
          // Explicit injection keeps this isolated HTTP fixture out of the
          // production gateway/conversations circular module graph.
          inject: [
            CALLS_REPOSITORY,
            MESSAGES_REPOSITORY,
            ConversationsService,
            RedisService,
            VisibilityResolver,
            ConfigService,
          ],
          useFactory: (
            repository: ICallsRepository,
            messages: IMessagesRepository,
            conversations: ConversationsService,
            redis: RedisService,
            visibility: VisibilityResolver,
            config: ConfigService,
          ) => new CallsService(repository, messages, conversations, redis, visibility, config),
        },
        JwtStrategy,
        { provide: ConfigService, useValue: new ConfigService({ JWT_ACCESS_SECRET: secret }) },
        { provide: CALLS_REPOSITORY, useValue: calls },
        { provide: MESSAGES_REPOSITORY, useValue: {} },
        { provide: ConversationsService, useValue: {} },
        { provide: RedisService, useValue: {} },
        { provide: VisibilityResolver, useValue: {} },
        { provide: CallsStepUpService, useValue: {} },
        {
          provide: UsersService,
          useValue: {
            findById: async (id: string) => ({
              id,
              username: 'synthetic',
              email: 'synthetic@example.test',
            }),
          },
        },
        { provide: TokenRevocationService, useValue: { isTokenRevoked: async () => false } },
      ],
    }).compile();
    service = module.get(CallsService);
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterEach(async () => {
    expect(calls.findCallById).not.toHaveBeenCalled();
    expect(calls.saveTelemetry).not.toHaveBeenCalled();
    await app?.close();
    vi.restoreAllMocks();
  });

  it.each(['synthetic-call', 'unknown-call'])(
    'rejects direct service submissions for %s before reading or writing storage',
    async (callId) => {
      await expect(service.saveTelemetry('alice', { ...payload, callId })).rejects.toMatchObject({
        status: 410,
        message: 'Call quality telemetry collection is disabled',
      });
    },
  );

  it('keeps HTTP authentication ahead of the disabled collection response', async () => {
    const save = vi.spyOn(service, 'saveTelemetry');
    for (const authorization of ['', 'Bearer forged']) {
      const response = await app.inject({
        method: 'POST',
        url: '/calls/telemetry',
        headers: { authorization },
        payload,
      });
      expect(response.statusCode).toBe(401);
    }
    expect(save).not.toHaveBeenCalled();
  });

  it('keeps DTO validation for authenticated HTTP submissions', async () => {
    const save = vi.spyOn(service, 'saveTelemetry');
    for (const invalid of [
      { ...payload, packetLossRatio: 2 },
      { ...payload, arbitrary: 'forbidden' },
    ]) {
      const response = await app.inject({
        method: 'POST',
        url: '/calls/telemetry',
        headers: headers(),
        payload: invalid,
      });
      expect(response.statusCode).toBe(400);
    }
    expect(save).not.toHaveBeenCalled();
  });

  it('returns HTTP 410 with a constant message for valid authenticated submissions', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/calls/telemetry',
      headers: headers(),
      payload,
    });
    expect(response.statusCode).toBe(410);
    expect(response.json()).toMatchObject({
      message: 'Call quality telemetry collection is disabled',
      statusCode: 410,
    });
  });
});
