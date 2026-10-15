import { BadRequestException } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import type { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import { mkdtemp, mkdir, writeFile, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readPostMediaReference } from '../post-media-reference';
import { PostsMediaService } from '../../../posts/posts-media.service';
import { pngImage, gifImage } from './upload-fixtures';

describe('post media reference boundary', () => {
  const publicUrl = 'https://storage.example.com';
  const uploadedUrl = publicUrl + '/posts/posts/1234567890abcdef.webp';
  const gifUrl = 'https://media.giphy.com/media/example/giphy.gif';
  let send: ReturnType<typeof vi.fn>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let storage: { s3: S3Client; bucket: string; publicUrl: string };
  let service: PostsMediaService;

  beforeEach(() => {
    vi.stubEnv('R2_PUBLIC_URL', '');
    vi.stubEnv('S3_FORCE_PATH_STYLE', 'true');
    send = vi
      .fn()
      .mockImplementation((command: unknown) =>
        command instanceof GetObjectCommand
          ? { Body: Readable.from([pngImage]), ContentLength: pngImage.length }
          : {},
      );
    fetchMock = vi.fn().mockImplementation(() => new Response(new Uint8Array(gifImage)));
    vi.stubGlobal('fetch', fetchMock);
    storage = { s3: { send } as unknown as S3Client, bucket: 'posts', publicUrl };
    service = new PostsMediaService(storage.s3, {
      get: (_key: string, fallback?: string) =>
        _key === 'MINIO_PUBLIC_URL' ? publicUrl : fallback,
    } as unknown as ConfigService);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    'data:image/png;base64,AAAA',
    'http://127.0.0.1/private',
    'https://other.example/image.png',
    uploadedUrl + '?x=1',
  ])('rejects arbitrary uploaded URL %s without fetching it', async (url) => {
    await expect(readPostMediaReference({ url, kind: 'uploaded' }, storage)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(send).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    'http://media.giphy.com/image.gif',
    'https://media.giphy.com.evil.example/image.gif',
    'https://127.0.0.1/image.gif',
    'https://user:pass@media.giphy.com/image.gif',
  ])('rejects unapproved GIF URL %s', async (url) => {
    await expect(readPostMediaReference({ url, kind: 'gif' }, storage)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads owned storage directly and reprocesses real images before persistence', async () => {
    const result = await service.processUploadedFiles(
      [],
      [
        { url: uploadedUrl, kind: 'uploaded' },
        { url: gifUrl, kind: 'gif' },
      ],
    );
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('IMAGE');
    expect(result[1].type).toBe('IMAGE');
    expect(send.mock.calls.filter(([command]) => command instanceof PutObjectCommand)).toHaveLength(
      2,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(gifUrl),
      expect.objectContaining({ redirect: 'error' }),
    );
  });

  it('accepts direct bucket URLs used by R2 without an extra bucket prefix', async () => {
    const directStorage = { ...storage, publicUrl: 'https://media.example.com/posts' };
    expect(
      await readPostMediaReference(
        { url: directStorage.publicUrl + '/posts/1234567890abcdef.webp', kind: 'uploaded' },
        directStorage,
      ),
    ).toEqual(pngImage);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ input: { Bucket: 'posts', Key: 'posts/1234567890abcdef.webp' } }),
    );
  });

  it('reads valid local development uploads without falling back to arbitrary HTTP fetches', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'post-reference-test-'));
    const folder = join(directory, 'posts');
    const file = join(folder, '1234567890abcdef.webp');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('RENDER', '');
    vi.stubEnv('RENDER_SERVICE_ID', '');
    vi.stubEnv('STORAGE_DRIVER', 'local');
    vi.stubEnv('LOCAL_STORAGE_DIR', directory);
    vi.stubEnv('LOCAL_STORAGE_PUBLIC_URL', 'http://localhost:3000');
    try {
      await mkdir(folder);
      await writeFile(file, pngImage);
      expect(
        await readPostMediaReference(
          { url: 'http://localhost:3000/uploads/posts/1234567890abcdef.webp', kind: 'uploaded' },
          storage,
        ),
      ).toEqual(pngImage);
      expect(send).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await unlink(file).catch(() => undefined);
      await rmdir(folder).catch(() => undefined);
      await rmdir(directory);
    }
  });

  it('rejects invalid bytes from both approved GIF and storage URLs before any write', async () => {
    fetchMock.mockImplementation(() => new Response('MZ invalid file'));
    await expect(
      service.processUploadedFiles(
        [{ buffer: pngImage, mimetype: 'image/png' } as Express.Multer.File],
        [{ url: gifUrl, kind: 'gif' }],
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(send).not.toHaveBeenCalled();
    send.mockResolvedValue({ Body: Readable.from([Buffer.from('MZ invalid file')]) });
    await expect(
      service.processUploadedFiles([], [{ url: uploadedUrl, kind: 'uploaded' }]),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(send.mock.calls.every(([command]) => command instanceof GetObjectCommand)).toBe(true);
  });

  it('bounds GIF streams even without Content-Length and stops at the combined attachment limit', async () => {
    fetchMock.mockImplementation(
      () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(10 * 1024 * 1024 + 1));
              controller.close();
            },
          }),
        ),
    );
    await expect(readPostMediaReference({ url: gifUrl, kind: 'gif' }, storage)).rejects.toThrow(
      /too large/,
    );
    fetchMock.mockClear();
    await expect(
      service.processUploadedFiles(
        [],
        Array.from({ length: 6 }, () => ({ url: gifUrl, kind: 'gif' as const })),
      ),
    ).rejects.toThrow(/Maximum 5/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('rejects failed or redirected GIF responses', async () => {
    fetchMock.mockRejectedValue(new Error('redirect forbidden'));
    await expect(readPostMediaReference({ url: gifUrl, kind: 'gif' }, storage)).rejects.toThrow(
      /could not be loaded/,
    );
  });
});
