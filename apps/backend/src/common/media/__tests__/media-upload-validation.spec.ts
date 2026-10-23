import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { S3Client } from '@aws-sdk/client-s3';
import type { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import {
  optimizeAvatar,
  optimizeBanner,
  optimizePostImage,
  optimizeGroupAvatar,
} from '../image-processor';
import { validateUploadedMedia } from '../media-upload-validator';
import { PostsMediaService } from '../../../posts/posts-media.service';
import {
  pngImage,
  gifImage,
  sampleVideo,
  sampleAudio,
  sampleFlacAudio,
  voiceWebm,
  damagedVideoWebm,
} from './upload-fixtures';

describe('untrusted media uploads', () => {
  const optimizers = [optimizeAvatar, optimizeBanner, optimizePostImage, optimizeGroupAvatar];
  const invalidImages = [
    Buffer.from('MZ harmless executable-like bytes'),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'),
    pngImage.subarray(0, 20),
    Buffer.from('GIF89a damaged payload'),
    Buffer.alloc(0),
  ];

  it.each(optimizers)(
    'rejects arbitrary, truncated and empty images without a raw fallback',
    async (optimize) => {
      for (const buffer of invalidImages)
        await expect(optimize(buffer)).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it.each(optimizers)(
    'produces decodable clean output for valid JPEG, PNG, WebP and GIF',
    async (optimize) => {
      const jpeg = await sharp(pngImage).jpeg().withMetadata().toBuffer();
      const webp = await sharp(pngImage).webp().toBuffer();
      for (const buffer of [jpeg, pngImage, webp, gifImage]) {
        const output = await optimize(buffer);
        const metadata = await sharp(output.buffer, { animated: true }).metadata();
        expect(metadata.width).toBe(2);
        expect(metadata.height).toBe(2);
        expect(metadata.exif).toBeUndefined();
        expect(output.buffer).not.toEqual(buffer);
      }
    },
  );

  it('rejects excessively wide images before resizing them', async () => {
    const wide = await sharp({
      create: { width: 16385, height: 1, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();
    await expect(optimizeBanner(wide)).rejects.toThrow(/dimensions/);
  });

  it('accepts AVIF photos and produces decodable output while rejecting damaged AVIF', async () => {
    const avif = await sharp(pngImage).avif().toBuffer();
    expect(await validateUploadedMedia(avif, 'story')).toMatchObject({
      kind: 'image',
      mime: 'image/avif',
    });
    const output = await optimizePostImage(avif);
    expect((await sharp(output.buffer).metadata()).width).toBe(2);
    await expect(optimizePostImage(avif.subarray(0, 24))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('accepts decodable FLAC voice stories while rejecting truncated FLAC', async () => {
    const flac = await sampleFlacAudio();
    expect(await validateUploadedMedia(flac, 'story')).toMatchObject({
      kind: 'audio',
      mime: 'audio/flac',
      ext: 'flac',
    });
    await expect(validateUploadedMedia(flac.subarray(0, 8), 'story')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('preserves multiple GIF frames', async () => {
    const animation = await sharp(Buffer.from([255, 0, 0, 255, 0, 0, 0, 0, 255, 0, 0, 255]), {
      raw: { width: 2, height: 2, channels: 3, pageHeight: 1 },
    })
      .gif({ delay: [100, 100], loop: 0 })
      .toBuffer();
    const result = await optimizeBanner(animation);
    expect((await sharp(result.buffer, { animated: true }).metadata()).pages).toBe(2);
  });

  it.each([
    Buffer.from('MZ fake.exe'),
    Buffer.from([0, 0, 0, 32, 0x66, 0x74, 0x79, 0x70]),
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
    Buffer.from('OggS invalid audio'),
  ])('rejects files with fake or incomplete media containers', async (buffer) => {
    await expect(validateUploadedMedia(buffer, 'story')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('recognizes real MP4 independently of client MIME', async () => {
    expect(await validateUploadedMedia(await sampleVideo(), 'post')).toMatchObject({
      kind: 'video',
      mime: 'video/mp4',
    });
  });

  it('recognizes real WAV independently of client MIME', async () => {
    expect(await validateUploadedMedia(await sampleAudio(), 'story')).toMatchObject({
      kind: 'audio',
      mime: 'audio/wav',
    });
  });

  it('recognizes audio-only WebM independently of client MIME', async () => {
    expect(await validateUploadedMedia(await voiceWebm(), 'story')).toMatchObject({
      kind: 'audio',
      mime: 'audio/webm',
    });
  });

  it('rejects audio attachments on posts', async () => {
    await expect(validateUploadedMedia(await sampleAudio(), 'post')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('validates every attachment before any storage write, including chunk assembly', async () => {
    const send = vi.fn().mockResolvedValue({});
    const config = { get: vi.fn((_key: string, fallback?: string) => fallback) };
    const service = new PostsMediaService(
      { send } as unknown as S3Client,
      config as unknown as ConfigService,
    );
    const valid = { buffer: pngImage, mimetype: 'image/png' } as Express.Multer.File;
    const invalid = {
      buffer: Buffer.from('MZ fake image'),
      mimetype: 'image/png',
    } as Express.Multer.File;
    await expect(service.processUploadedFiles([valid, invalid])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(send).not.toHaveBeenCalled();
    await service.uploadChunk('bad-upload', 0, 2, invalid, 'usr-1');
    await expect(service.uploadChunk('bad-upload', 1, 2, invalid, 'usr-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(send).not.toHaveBeenCalled();
  });
  it('rejects a well-formed WebM containing an undecodable audio packet', async () => {
    await expect(
      validateUploadedMedia(await voiceWebm(new Uint8Array([0xff])), 'story'),
    ).rejects.toThrow(/damaged|decoded/);
  });
  it('rejects a well-formed WebM containing an undecodable video packet', async () => {
    await expect(validateUploadedMedia(await damagedVideoWebm(), 'post')).rejects.toThrow(
      /damaged|decoded/,
    );
  });
  it('fails closed with a retryable error when the decoder is unavailable', async () => {
    vi.stubEnv('FFMPEG_PATH', 'codex-test-missing-decoder');
    try {
      await expect(validateUploadedMedia(await sampleVideo(), 'post')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    } finally {
      vi.unstubAllEnvs();
    }
    await expect(validateUploadedMedia(await sampleVideo(), 'post')).resolves.toMatchObject({
      kind: 'video',
    });
  });
});
