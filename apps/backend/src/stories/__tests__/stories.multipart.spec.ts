import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StoriesController } from '../stories.controller';
import { StoriesService } from '../stories.service';

describe('Story multipart upload on Fastify', () => {
  let app: NestFastifyApplication;
  const createStory = vi.fn().mockResolvedValue({ id: 'story-1' });
  const boundary = 'story-upload-test';
  const image = Buffer.from('test-image-content');
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="mediaType"\r\n\r\nIMAGE\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\nMy story\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="overlays"\r\n\r\n[]\r\n` +
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="story.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
    ),
    image,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  beforeEach(async () => {
    createStory.mockClear();
    const module = await Test.createTestingModule({
      controllers: [StoriesController],
      providers: [{ provide: StoriesService, useValue: { createStory } }],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const request = context.switchToHttp().getRequest<{
            headers: Record<string, string | undefined>;
            user?: { id: string };
          }>();
          if (request.headers.authorization !== 'Bearer test-session')
            throw new UnauthorizedException();
          request.user = { id: 'author-1' };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(multipart, { limits: { fileSize: 100 * 1024 * 1024, files: 10 } });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('passes the uploaded file and validated fields to the authenticated author', async () => {
    const result = await app.inject({
      method: 'POST',
      url: '/stories',
      headers: {
        authorization: 'Bearer test-session',
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });
    expect(result.statusCode).toBe(201);
    expect(result.json()).toEqual({ id: 'story-1' });
    expect(createStory).toHaveBeenCalledWith(
      'author-1',
      expect.objectContaining({ caption: 'My story', mediaType: 'IMAGE', overlays: [] }),
      expect.objectContaining({
        fieldname: 'file',
        originalname: 'story.jpg',
        mimetype: 'image/jpeg',
        buffer: image,
        size: image.length,
      }),
    );
  });

  it('rejects unauthenticated uploads before calling the story service', async () => {
    const result = await app.inject({
      method: 'POST',
      url: '/stories',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(result.statusCode).toBe(401);
    expect(createStory).not.toHaveBeenCalled();
  });
});
