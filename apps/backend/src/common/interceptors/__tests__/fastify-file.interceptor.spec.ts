import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
  type ExecutionContext,
} from '@nestjs/common';
import { Readable } from 'node:stream';
import { of } from 'rxjs';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import multipart from '@fastify/multipart';
import { FastifyFileInterceptor, FastifyFilesInterceptor } from '../fastify-file.interceptor';

const filePart = (fieldname = 'file', buffer = Buffer.from('bytes')) => ({
  fieldname,
  filename: 'upload.png',
  mimetype: 'image/png',
  file: new Readable(),
  toBuffer: vi.fn().mockResolvedValue(buffer),
});
const run = async (parts: ReturnType<typeof filePart>[], plural = false) => {
  const request = {
    isMultipart: () => true,
    parts: async function* () {
      yield* parts;
    },
  };
  const context = {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
  const next = { handle: vi.fn(() => of(undefined)) };
  const Interceptor = plural ? FastifyFilesInterceptor('files', 5) : FastifyFileInterceptor();
  await new Interceptor().intercept(context, next);
  return { request, next };
};

describe('multipart extraction failure handling', () => {
  it('keeps valid single and multiple uploads working', async () => {
    expect((await run([filePart()])).next.handle).toHaveBeenCalledTimes(1);
    expect(
      (await run([filePart('files'), filePart('files')], true)).next.handle,
    ).toHaveBeenCalledTimes(1);
  });
  it('rejects unknown fields and excess files', async () => {
    await expect(run([filePart('wrong')])).rejects.toBeInstanceOf(BadRequestException);
    await expect(run([filePart(), filePart()])).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      run(
        Array.from({ length: 6 }, () => filePart('files')),
        true,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects empty, interrupted and truncated files instead of calling the controller', async () => {
    await expect(run([filePart('file', Buffer.alloc(0))])).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const interrupted = filePart();
    interrupted.toBuffer.mockRejectedValue(new Error('Stream aborted'));
    await expect(run([interrupted])).rejects.toBeInstanceOf(BadRequestException);
    const truncated = filePart();
    Object.assign(truncated.file, { truncated: true });
    await expect(run([truncated])).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});

describe('real multipart requests', () => {
  it('returns errors for empty, oversized, duplicate and unexpected files without continuing publication', async () => {
    const adapter = new FastifyAdapter();
    const app = adapter.getInstance();
    const next = { handle: vi.fn(() => of(undefined)) };
    const Interceptor = FastifyFileInterceptor();
    await app.register(multipart, { limits: { fileSize: 16, files: 8 } });
    app.post('/upload', async (request, reply) => {
      const context = {
        getType: () => 'http',
        switchToHttp: () => ({ getRequest: () => request }),
      } as ExecutionContext;
      try {
        await new Interceptor().intercept(context, next);
        return { accepted: true };
      } catch (error) {
        if (error instanceof HttpException)
          return reply.code(error.getStatus()).send({ error: error.message });
        throw error;
      }
    });
    const payload = (files: { field: string; bytes: string }[]) =>
      files
        .map(
          ({ field, bytes }) =>
            '--boundary\r\nContent-Disposition: form-data; name="' +
            field +
            '"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n' +
            bytes +
            '\r\n',
        )
        .join('') + '--boundary--\r\n';
    try {
      for (const [files, status] of [
        [[{ field: 'file', bytes: 'ok' }], 200],
        [[{ field: 'file', bytes: '' }], 400],
        [[{ field: 'file', bytes: 'x'.repeat(17) }], 413],
        [[{ field: 'other', bytes: 'ok' }], 400],
        [
          [
            { field: 'file', bytes: 'ok' },
            { field: 'file', bytes: 'ok' },
          ],
          400,
        ],
      ] as const) {
        const response = await app.inject({
          method: 'POST',
          url: '/upload',
          headers: { 'content-type': 'multipart/form-data; boundary=boundary' },
          payload: payload([...files]),
        });
        expect(response.statusCode).toBe(status);
      }
      expect(next.handle).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });
});

describe('JSON posts without file parts', () => {
  it('normalizes the multipart files() decorator to an empty upload array', async () => {
    const adapter = new FastifyAdapter();
    const app = adapter.getInstance();
    const next = { handle: vi.fn(() => of(undefined)) };
    const Interceptor = FastifyFilesInterceptor('media', 5);
    await app.register(multipart);
    app.post('/posts', async (request) => {
      const before = typeof request.files;
      const context = {
        getType: () => 'http',
        switchToHttp: () => ({ getRequest: () => request }),
      } as ExecutionContext;
      await new Interceptor().intercept(context, next);
      const files: unknown = Reflect.get(request, 'files');
      return {
        before,
        array: Array.isArray(files),
        count: Array.isArray(files) ? files.length : null,
      };
    });
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/posts',
        payload: { content: 'Text post' },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ before: 'function', array: true, count: 0 });
      expect(next.handle).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });
});
