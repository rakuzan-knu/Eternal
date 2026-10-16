import { Test } from '@nestjs/testing';
import { type ExecutionContext } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AvatarsController } from '../../avatars/avatars.controller';
import { AvatarsService } from '../../avatars/avatars.service';
import { BannersController } from '../../banners/banners.controller';
import { BannersService } from '../../banners/banners.service';
import { CommentsController } from '../../comments/comments.controller';
import { CommentsService } from '../../comments/comments.service';
import { CommentsMediaService } from '../../comments/comments-media.service';
import { ConversationsController } from '../../messenger/conversations/conversations.controller';
import { ConversationsService } from '../../messenger/conversations/conversations.service';
import { MessagesService } from '../../messenger/messages/messages.service';

describe('metadata-only upload consumers on the real Fastify adapter', () => {
  let app: NestFastifyApplication;
  const uploadId = '11111111-1111-4111-8111-111111111111';
  const avatar = vi.fn().mockResolvedValue({ avatar: 'https://cdn.test/avatar.webp' });
  const banner = vi.fn().mockResolvedValue({ banner: 'https://cdn.test/banner.webp' });
  const comment = vi.fn().mockResolvedValue({ url: 'https://cdn.test/comment.webp' });
  const attachment = vi.fn().mockResolvedValue({ url: 'https://cdn.test/chat.bin' });
  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [
        AvatarsController,
        BannersController,
        CommentsController,
        ConversationsController,
      ],
      providers: [
        { provide: AvatarsService, useValue: { useDirectAvatar: avatar } },
        { provide: BannersService, useValue: { useDirectBanner: banner } },
        { provide: CommentsMediaService, useValue: { processCommentImage: comment } },
        { provide: MessagesService, useValue: { uploadAttachment: attachment } },
        { provide: ConversationsService, useValue: {} },
        { provide: CommentsService, useValue: {} },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          context.switchToHttp().getRequest<{ user: { id: string } }>().user = { id: 'alice' };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(multipart);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });
  async function post(url: string, withFile = false) {
    const form = new FormData();
    form.append('uploadId', uploadId);
    form.append('bannerPosition', '20');
    if (withFile) form.append('file', new Blob(['unwanted bytes']), 'file.bin');
    const request = new Request('https://unit.test', { method: 'POST', body: form });
    return app.inject({
      method: 'POST',
      url,
      headers: { 'content-type': request.headers.get('content-type')! },
      payload: Buffer.from(await request.arrayBuffer()),
    });
  }
  it('accepts direct upload receipts without treating Fastify file() as an uploaded file', async () => {
    for (const url of [
      '/users/alice/avatar',
      '/users/alice/banner',
      '/comments/media',
      '/conversations/chat/attachments',
    ])
      expect((await post(url)).statusCode).toBeLessThan(300);
    expect(avatar).toHaveBeenCalledWith('alice', uploadId);
    expect(banner).toHaveBeenCalledWith('alice', uploadId, 20);
    expect(comment).toHaveBeenCalledWith(undefined, 'alice', uploadId);
    expect(attachment).toHaveBeenCalledWith('chat', 'alice', undefined, uploadId);
  });
  it('rejects profile changes for another user before using the receipt', async () => {
    expect((await post('/users/bob/avatar')).statusCode).toBe(403);
    expect((await post('/users/bob/banner')).statusCode).toBe(403);
    expect(avatar).not.toHaveBeenCalled();
    expect(banner).not.toHaveBeenCalled();
  });
  it('rejects legacy byte uploads before calling a consumer when direct uploads are required', async () => {
    vi.stubEnv('DIRECT_UPLOADS_REQUIRED', 'true');
    expect((await post('/comments/media', true)).statusCode).toBe(400);
    expect(comment).not.toHaveBeenCalled();
  });
});
