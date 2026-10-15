import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '@common/prisma';
import { ShowcaseService } from '../../showcase/showcase.service';
import { IntegrationsController } from '../integrations.controller';
import { IntegrationsService } from '../integrations.service';
import { SpotifyService } from '../spotify.service';
import { SoundCloudService } from '../soundcloud.service';

describe('SoundCloud audio transport with NestFastify', () => {
  let app: NestFastifyApplication;
  const getStreamUrl = vi.fn<SoundCloudService['getStreamUrl']>();
  const upstreamFetch = vi.fn<typeof fetch>();
  const localhostFetch = globalThis.fetch;
  const streamUrl = 'https://cf-media.sndcdn.com/test-audio.mp3';

  beforeEach(async () => {
    vi.stubEnv('SOUNDCLOUD_AUDIO_PROXY_ENABLED', 'true');
    getStreamUrl.mockReset().mockResolvedValue({
      streamUrl,
      isHls: false,
      mimeType: 'audio/mpeg',
    });
    upstreamFetch.mockReset();
    vi.stubGlobal('fetch', upstreamFetch);
    const module = await Test.createTestingModule({
      controllers: [IntegrationsController],
      providers: [
        ...[PrismaService, ShowcaseService, IntegrationsService, SpotifyService].map((provide) => ({
          provide,
          useValue: {},
        })),
        { provide: SoundCloudService, useValue: { getStreamUrl } },
      ],
    }).compile();
    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('forwards Range and delivers exact streamed bytes with upstream 206 and media headers', async () => {
    const bytes = Buffer.from([0, 255, 44, 128]);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.subarray(0, 2));
        controller.enqueue(bytes.subarray(2));
        controller.close();
      },
    });
    upstreamFetch.mockResolvedValue(
      new Response(body, {
        status: 206,
        headers: {
          'content-type': 'audio/mpeg',
          'content-length': '4',
          'content-range': 'bytes 0-3/8',
          'accept-ranges': 'bytes',
          'x-upstream-extra': 'not-forwarded',
        },
      }),
    );

    const response = await app.inject({
      method: 'GET',
      url: '/integrations/soundcloud/stream/123/audio',
      headers: { range: 'bytes=0-3', authorization: 'Bearer local-test-token' },
    });

    expect(getStreamUrl).toHaveBeenCalledWith('123');
    expect(upstreamFetch).toHaveBeenCalledWith(streamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Range: 'bytes=0-3',
      },
    });
    expect(response.statusCode).toBe(206);
    expect(response.rawPayload).toEqual(bytes);
    expect(response.headers['content-type']).toBe('audio/mpeg');
    expect(response.headers['content-length']).toBe('4');
    expect(response.headers['content-range']).toBe('bytes 0-3/8');
    expect(response.headers['accept-ranges']).toBe('bytes');
    expect(response.headers['x-upstream-extra']).toBeUndefined();
  });

  it('supplies Accept-Ranges when the upstream does not provide it', async () => {
    upstreamFetch.mockResolvedValue(
      new Response('audio', { headers: { 'content-type': 'audio/mpeg' } }),
    );

    const response = await app.inject('/integrations/soundcloud/stream/123/audio');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('audio');
    expect(response.headers['accept-ranges']).toBe('bytes');
  });

  it('redirects to the resolved stream without proxying audio by default', async () => {
    vi.stubEnv('SOUNDCLOUD_AUDIO_PROXY_ENABLED', undefined);
    const response = await app.inject('/integrations/soundcloud/stream/123/audio');
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(streamUrl);
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('returns JSON 404 without fetching when no stream URL was resolved', async () => {
    getStreamUrl.mockResolvedValue(null);

    const response = await app.inject('/integrations/soundcloud/stream/123/audio');

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Stream not found' });
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('redirects with HTTP 302 to the resolved URL if the upstream fetch fails', async () => {
    upstreamFetch.mockRejectedValue(new Error('Upstream unavailable'));

    const response = await app.inject('/integrations/soundcloud/stream/123/audio');

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(streamUrl);
  });

  it('finishes an upstream response without an audio body', async () => {
    upstreamFetch.mockResolvedValue(new Response(null, { status: 204 }));

    const response = await app.inject('/integrations/soundcloud/stream/123/audio');

    expect(response.statusCode).toBe(204);
    expect(response.rawPayload).toHaveLength(0);
  });

  it('cancels the upstream Web stream when the HTTP client aborts after the first chunk', async () => {
    let notifyCancellation: (() => void) | undefined;
    const upstreamCancelled = new Promise<void>((resolve) => {
      notifyCancellation = resolve;
    });
    const cancelUpstream = vi.fn(() => notifyCancellation?.());
    const firstChunk = Buffer.from([0, 255, 44, 128]);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(firstChunk);
        // Remain open so only client cancellation can finish this upstream stream.
      },
      cancel: cancelUpstream,
    });
    upstreamFetch.mockResolvedValue(
      new Response(body, { headers: { 'content-type': 'audio/mpeg' } }),
    );
    await app.listen(0, '127.0.0.1');
    const abort = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let cancellationTimeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const response = await localhostFetch(
        `${await app.getUrl()}/integrations/soundcloud/stream/123/audio`,
        { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(3000)]) },
      );
      expect(response.status).toBe(200);
      reader = response.body?.getReader();
      if (!reader) throw new Error('Missing local audio response body');
      const chunk = await reader.read();
      expect(chunk.done).toBe(false);
      if (!chunk.value) throw new Error('Missing first audio chunk');
      expect(Buffer.from(chunk.value)).toEqual(firstChunk);

      abort.abort();
      await Promise.race([
        upstreamCancelled,
        new Promise<never>((_, reject) => {
          cancellationTimeout = setTimeout(
            () => reject(new Error('HTTP client abort did not cancel the upstream stream')),
            2000,
          );
        }),
      ]);
      expect(cancelUpstream).toHaveBeenCalledTimes(1);
      expect(upstreamFetch).toHaveBeenCalledTimes(1);
    } finally {
      clearTimeout(cancellationTimeout);
      abort.abort();
      reader?.releaseLock();
    }
  });
});
