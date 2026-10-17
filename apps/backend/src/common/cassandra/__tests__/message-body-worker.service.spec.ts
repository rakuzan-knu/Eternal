import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { MessageBodyWorkerService } from '../message-body-worker.service';
import { MessageBodyService } from '../message-body.service';
import { MessageBodyRepository } from '../message-body.repository';

describe('Message archive worker ownership', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
  it.each([
    ['core', 'true', 'true', false],
    ['messenger', 'false', 'true', false],
    ['messenger', 'true', 'false', false],
    ['messenger', 'true', 'true', true],
  ])('role=%s background=%s archive=%s', async (role, background, enabled, runs) => {
    vi.useFakeTimers();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('SERVICE_ROLE', String(role));
    vi.stubEnv('BACKGROUND_ENABLED', String(background));
    const processOne = vi.fn().mockResolvedValue(false);
    const module = await Test.createTestingModule({
      providers: [
        MessageBodyWorkerService,
        {
          provide: ConfigService,
          useValue: new ConfigService({ MESSAGE_BODY_ARCHIVE_ENABLED: enabled }),
        },
        { provide: MessageBodyService, useValue: { processOne } },
        { provide: MessageBodyRepository, useValue: { configured: true } },
      ],
    }).compile();
    const worker = module.get(MessageBodyWorkerService);
    worker.onModuleInit();
    await vi.advanceTimersByTimeAsync(60_000);
    await worker.onModuleDestroy();
    expect(processOne).toHaveBeenCalledTimes(runs ? 1 : 0);
    await module.close();
  });
});
