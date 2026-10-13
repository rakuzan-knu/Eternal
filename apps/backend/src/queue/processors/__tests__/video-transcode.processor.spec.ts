import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import type * as S3Sdk from '@aws-sdk/client-s3';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import * as path from 'node:path';
import * as fs from 'fs/promises';
import { PrismaService } from '@common/prisma';
import { VideoTranscodeProcessor, MAX_VIDEO_SOURCE_BYTES } from '../video-transcode.processor';

const { spawnMock, send } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
  send: vi.fn<
    (
      command: GetObjectCommand,
      options?: { abortSignal: AbortSignal },
    ) => Promise<{ Body?: Readable; ContentLength?: number }>
  >(),
}));
vi.mock('@aws-sdk/client-s3', async (importOriginal) => ({
  ...(await importOriginal<typeof S3Sdk>()),
  S3Client: class {
    send = send;
  },
}));
vi.mock('@common/prisma', () => ({ PrismaService: class {} }));
vi.mock('child_process', () => ({ spawn: spawnMock }));
vi.mock('fs/promises', () => ({
  mkdtemp: vi.fn().mockResolvedValue('/tmp/hls-test'),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(Buffer.from('thumbnail')),
  rm: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../../common/media/image-processor', () => ({
  generateBlurHash: vi.fn().mockResolvedValue({ blurhash: 'test-blurhash' }),
}));

describe('VideoTranscodeProcessor source contract', () => {
  let processor: VideoTranscodeProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    spawnMock.mockImplementation(() => {
      const process = new EventEmitter();
      queueMicrotask(() => process.emit('close', 0));
      return process;
    });
    const s3 = new S3Client({ region: 'us-east-1' });
    processor = new VideoTranscodeProcessor(
      new ConfigService({ R2_BUCKET: 'trusted-bucket' }),
      new PrismaService(),
      s3,
    );
  });

  it('reads a storage key from the configured bucket rather than fetching the video URL', async () => {
    send.mockResolvedValue({
      Body: Readable.from([Buffer.from('video-source')]),
      ContentLength: 12,
    });

    await processor.transcodeToAdaptiveHls({
      videoUrl: 'http://169.254.169.254/private',
      sourceStorageKey: 'reels/clip.mp4',
    });

    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    expect(send.mock.calls[0][1]?.abortSignal).toBeInstanceOf(AbortSignal);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'trusted-bucket',
      Key: 'reels/clip.mp4',
    });
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('/tmp/hls-test', 'input.mp4'),
      Buffer.from('video-source'),
    );
  });

  it.each(['../secret', 'reels/../secret.mp4', 'https://example.com/video.mp4', 'posts/clip.mp4'])(
    'rejects an untrusted source key %s before contacting storage',
    async (sourceStorageKey) => {
      await expect(
        processor.transcodeToAdaptiveHls({
          videoUrl: 'https://example.com/clip.mp4',
          sourceStorageKey,
        }),
      ).rejects.toThrow('Invalid video source storage key');
      expect(send).not.toHaveBeenCalled();
    },
  );

  it('rejects oversized objects and closes their stream before buffering them', async () => {
    const body = Readable.from([Buffer.from('video-source')]);
    send.mockResolvedValue({ Body: body, ContentLength: MAX_VIDEO_SOURCE_BYTES + 1 });

    await expect(
      processor.transcodeToAdaptiveHls({
        videoUrl: 'https://example.com/clip.mp4',
        sourceStorageKey: 'reels/clip.mp4',
      }),
    ).rejects.toThrow('Video source exceeds 150MB limit');
    expect(body.destroyed).toBe(true);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('enforces the streaming limit even when content length is missing', async () => {
    const body = Readable.from([Buffer.allocUnsafe(MAX_VIDEO_SOURCE_BYTES + 1)]);
    send.mockResolvedValue({ Body: body });

    await expect(
      processor.transcodeToAdaptiveHls({
        videoUrl: 'https://example.com/clip.mp4',
        sourceStorageKey: 'reels/clip.mp4',
      }),
    ).rejects.toThrow('Video source exceeds 150MB limit');
    expect(body.destroyed).toBe(true);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('propagates storage failures so BullMQ can retry', async () => {
    send.mockRejectedValue(new Error('Storage temporarily unavailable'));
    await expect(
      processor.transcodeToAdaptiveHls({
        videoUrl: 'https://example.com/clip.mp4',
        sourceStorageKey: 'reels/clip.mp4',
      }),
    ).rejects.toThrow('Storage temporarily unavailable');
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('rejects an empty storage object', async () => {
    send.mockResolvedValue({ Body: Readable.from([]) });
    await expect(
      processor.transcodeToAdaptiveHls({
        videoUrl: 'https://example.com/clip.mp4',
        sourceStorageKey: 'reels/clip.mp4',
      }),
    ).rejects.toThrow('Video source is empty');
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('closes a stalled storage stream after the read deadline', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const body = new Readable({ read() {} });
    send.mockResolvedValue({ Body: body });
    try {
      const rejected = expect(
        processor.transcodeToAdaptiveHls({
          videoUrl: 'https://example.com/clip.mp4',
          sourceStorageKey: 'reels/clip.mp4',
        }),
      ).rejects.toThrow('Video source read timed out');
      await vi.advanceTimersByTimeAsync(30_000);
      await rejected;
      expect(body.destroyed).toBe(true);
      expect(fs.writeFile).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps already queued base64 jobs compatible', async () => {
    await processor.transcodeToAdaptiveHls({
      videoUrl: 'https://example.com/clip.mp4',
      sourceBufferBase64: Buffer.from('legacy-video-source').toString('base64'),
    });
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('/tmp/hls-test', 'input.mp4'),
      Buffer.from('legacy-video-source'),
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps URL-only and missing-ffmpeg jobs from making remote source requests', async () => {
    await processor.transcodeToAdaptiveHls({ videoUrl: 'http://169.254.169.254/private' });
    spawnMock.mockImplementation(() => {
      const process = new EventEmitter();
      queueMicrotask(() => process.emit('error', new Error('ENOENT')));
      return process;
    });
    await processor.transcodeToAdaptiveHls({
      videoUrl: 'https://example.com/clip.mp4',
      sourceStorageKey: 'reels/clip.mp4',
    });
    expect(send).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});
