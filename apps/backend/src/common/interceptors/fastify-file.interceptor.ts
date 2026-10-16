import {
  BadRequestException,
  HttpException,
  PayloadTooLargeException,
  CallHandler,
  ExecutionContext,
  Injectable,
  mixin,
  NestInterceptor,
  Type,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Readable } from 'stream';

interface FastifyMultipartPart {
  fieldname?: string;
  filename?: string;
  encoding?: string;
  mimetype?: string;
  file?: Readable & { truncated?: boolean };
  toBuffer: () => Promise<Buffer>;
  value?: unknown;
  fields?: Record<string, { value?: unknown } | Record<string, unknown>>;
}

async function readFilePart(part: FastifyMultipartPart): Promise<Buffer> {
  const buffer = await part.toBuffer();
  if (part.file?.truncated)
    throw new PayloadTooLargeException('File size exceeds the upload limit');
  if (!buffer.length) throw new BadRequestException('Empty files cannot be uploaded');
  return buffer;
}

function rethrowMultipartError(error: unknown): never {
  if (error instanceof HttpException) throw error;
  const code = (error as { code?: string })?.code;
  if (
    code === 'FST_REQ_FILE_TOO_LARGE' ||
    code === 'FST_FILES_LIMIT' ||
    code === 'FST_PARTS_LIMIT'
  ) {
    throw new PayloadTooLargeException('Upload exceeds the file size or count limit');
  }
  throw new BadRequestException('Unable to read the uploaded file');
}

interface FastifyMultipartRequest {
  isMultipart?: () => boolean;
  parts?: (options?: { limits: { fileSize: number } }) => AsyncIterable<FastifyMultipartPart>;
  file?:
    | undefined
    | Express.Multer.File
    | ((options?: { limits: { fileSize: number } }) => Promise<FastifyMultipartPart>);
  files?: Express.Multer.File[] | (() => AsyncIterable<FastifyMultipartPart>);
  incomingFile?: Express.Multer.File;
  incomingFiles?: Express.Multer.File[];
  body?: Record<string, unknown>;
  [key: string]: unknown;
}

export function FastifyFileInterceptor(
  fieldName = 'file',
  maxFileBytes?: number,
): Type<NestInterceptor> {
  @Injectable()
  class Interceptor implements NestInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
      if (context.getType() !== 'http') {
        return next.handle();
      }

      const req = context.switchToHttp().getRequest<FastifyMultipartRequest>();

      const isFastifyMultipart = typeof req.isMultipart === 'function' && req.isMultipart();

      if (isFastifyMultipart) {
        try {
          let capturedFile: Express.Multer.File | undefined;
          const currentBody: Record<string, unknown> =
            req.body && typeof req.body === 'object' ? { ...req.body } : {};

          if (typeof req.parts === 'function') {
            for await (const part of req.parts(
              maxFileBytes ? { limits: { fileSize: maxFileBytes } } : undefined,
            )) {
              if (part.file) {
                if (process.env.DIRECT_UPLOADS_REQUIRED === 'true')
                  throw new BadRequestException('Use direct media uploads');
                if (!capturedFile && (!fieldName || part.fieldname === fieldName)) {
                  const buffer = await readFilePart(part);
                  if (maxFileBytes && buffer.length > maxFileBytes)
                    throw new PayloadTooLargeException('Chunk is too large');
                  capturedFile = {
                    fieldname: part.fieldname || fieldName,
                    originalname: part.filename || 'upload',
                    encoding: part.encoding || '7bit',
                    mimetype: part.mimetype || 'application/octet-stream',
                    size: buffer.length,
                    buffer,
                    stream: part.file,
                    destination: '',
                    filename: part.filename || 'upload',
                    path: '',
                  };
                } else if (
                  fieldName === 'video' &&
                  part.fieldname === 'thumbnail' &&
                  !req.thumbnailFile
                ) {
                  const buffer = await readFilePart(part);
                  if (maxFileBytes && buffer.length > maxFileBytes)
                    throw new PayloadTooLargeException('Chunk is too large');
                  req.thumbnailFile = {
                    fieldname: part.fieldname,
                    originalname: part.filename || 'thumbnail.webp',
                    encoding: part.encoding || '7bit',
                    mimetype: part.mimetype || 'image/webp',
                    size: buffer.length,
                    buffer,
                    stream: part.file,
                    destination: '',
                    filename: part.filename || 'thumbnail.webp',
                    path: '',
                  };
                } else {
                  throw new BadRequestException('Unexpected file field or too many files');
                }
              } else if (part.fieldname) {
                const existing = currentBody[part.fieldname];
                if (existing !== undefined) {
                  if (Array.isArray(existing)) {
                    existing.push(part.value);
                  } else {
                    currentBody[part.fieldname] = [existing, part.value];
                  }
                } else {
                  currentBody[part.fieldname] = part.value;
                }
              }
            }
          } else if (typeof req.file === 'function') {
            const fileFn = req.file;
            const part = await fileFn(
              maxFileBytes ? { limits: { fileSize: maxFileBytes } } : undefined,
            );
            if (part) {
              if (process.env.DIRECT_UPLOADS_REQUIRED === 'true')
                throw new BadRequestException('Use direct media uploads');
              if (fieldName && part.fieldname !== fieldName)
                throw new BadRequestException('Unexpected file field');
              const buffer = await readFilePart(part);
              if (maxFileBytes && buffer.length > maxFileBytes)
                throw new PayloadTooLargeException('Chunk is too large');
              capturedFile = {
                fieldname: part.fieldname || fieldName,
                originalname: part.filename || 'upload',
                encoding: part.encoding || '7bit',
                mimetype: part.mimetype || 'application/octet-stream',
                size: buffer.length,
                buffer,
                stream: part.file!,
                destination: '',
                filename: part.filename || 'upload',
                path: '',
              };

              if (part.fields && typeof part.fields === 'object') {
                for (const [key, fieldObj] of Object.entries(part.fields)) {
                  if (fieldObj && typeof fieldObj === 'object' && 'value' in fieldObj) {
                    currentBody[key] = (fieldObj as { value?: unknown }).value;
                  } else {
                    currentBody[key] = fieldObj;
                  }
                }
              }
            }
          }

          if (capturedFile) {
            req.file = capturedFile;
            req.incomingFile = capturedFile;
          }
          req.body = currentBody;
        } catch (error) {
          rethrowMultipartError(error);
        }
      }

      // Fastify decorates every request with a file() function, including metadata-only forms.
      if (typeof req.file === 'function') req.file = undefined;
      return next.handle();
    }
  }

  return mixin(Interceptor);
}

export function FastifyFilesInterceptor(fieldName = 'files', maxCount = 10): Type<NestInterceptor> {
  @Injectable()
  class Interceptor implements NestInterceptor {
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
      if (context.getType() !== 'http') {
        return next.handle();
      }

      const req = context.switchToHttp().getRequest<FastifyMultipartRequest>();

      const isFastifyMultipart = typeof req.isMultipart === 'function' && req.isMultipart();

      if (isFastifyMultipart && typeof req.parts === 'function') {
        try {
          const files: Express.Multer.File[] = [];
          const currentBody: Record<string, unknown> =
            req.body && typeof req.body === 'object' ? { ...req.body } : {};

          for await (const part of req.parts()) {
            if (part.file) {
              if (process.env.DIRECT_UPLOADS_REQUIRED === 'true')
                throw new BadRequestException('Use direct media uploads');
              if ((!fieldName || part.fieldname === fieldName) && files.length < maxCount) {
                const buffer = await readFilePart(part);
                files.push({
                  fieldname: part.fieldname || fieldName,
                  originalname: part.filename || 'upload',
                  encoding: part.encoding || '7bit',
                  mimetype: part.mimetype || 'application/octet-stream',
                  size: buffer.length,
                  buffer,
                  stream: part.file,
                  destination: '',
                  filename: part.filename || 'upload',
                  path: '',
                });
              } else {
                throw new BadRequestException('Unexpected file field or too many files');
              }
            } else if (part.fieldname) {
              const existing = currentBody[part.fieldname];
              if (existing !== undefined) {
                if (Array.isArray(existing)) {
                  existing.push(part.value);
                } else {
                  currentBody[part.fieldname] = [existing, part.value];
                }
              } else {
                currentBody[part.fieldname] = part.value;
              }
            }
          }

          req.files = files;
          req.incomingFiles = files;
          req.body = currentBody;
        } catch (error) {
          rethrowMultipartError(error);
        }
      }

      // The multipart plugin also decorates JSON requests with a files() method.
      if (typeof req.files === 'function') req.files = [];
      return next.handle();
    }
  }

  return mixin(Interceptor);
}
