import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { JwtStrategy } from '../../auth/strategies/jwt.strategy';
import { TokenRevocationService } from '../../auth/token-revocation.service';
import { UsersService } from '../../users/users.service';
import { DirectUploadsController } from './direct-uploads.controller';
import { DirectUploadsService } from './direct-uploads.service';
import { MediaBudgetService } from './media-budget.service';

describe('direct upload HTTP authentication and validation', () => {
  let app: NestFastifyApplication;
  const start = vi.fn().mockResolvedValue({ mode: 'direct', uploadId: 'reserved' });
  const complete = vi.fn().mockResolvedValue({ uploadId: 'reserved' });
  const secret = 'local-direct-upload-regression-only';
  const jwt = new JwtService({ secret });
  const input = {
    purpose: 'post',
    contentType: 'image/png',
    sizeBytes: 100,
    filename: 'photo.png',
  };
  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [DirectUploadsController],
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: new ConfigService({ JWT_ACCESS_SECRET: secret }) },
        {
          provide: UsersService,
          useValue: {
            findById: async (id: string) => ({ id, username: 'unit', email: 'unit@example.test' }),
          },
        },
        { provide: TokenRevocationService, useValue: { isTokenRevoked: async () => false } },
        { provide: DirectUploadsService, useValue: { start, complete, abort: vi.fn() } },
        { provide: MediaBudgetService, useValue: { getStatus: vi.fn() } },
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterEach(async () => app.close());
  it('rejects anonymous and forged sessions before upload admission', async () => {
    for (const authorization of ['', 'Bearer forged']) {
      const response = await app.inject({
        method: 'POST',
        url: '/uploads/direct',
        headers: { authorization },
        payload: input,
      });
      expect(response.statusCode).toBe(401);
    }
    expect(start).not.toHaveBeenCalled();
  });
  it('uses only the verified session user and rejects caller-selected ownership', async () => {
    const token = jwt.sign({ sub: 'alice', jti: 'session', type: 'access' });
    const headers = { authorization: `Bearer ${token}` };
    const accepted = await app.inject({
      method: 'POST',
      url: '/uploads/direct',
      headers,
      payload: input,
    });
    expect(accepted.statusCode).toBe(201);
    expect(start).toHaveBeenCalledWith('alice', input);
    const tampered = await app.inject({
      method: 'POST',
      url: '/uploads/direct',
      headers,
      payload: { ...input, userId: 'bob' },
    });
    expect(tampered.statusCode).toBe(400);
    expect(start).toHaveBeenCalledTimes(1);
  });
});
