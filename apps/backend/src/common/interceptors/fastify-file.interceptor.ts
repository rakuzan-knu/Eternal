import {
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
  file?: Readable;
  toBuffer: () => Promise<Buffer>;
  value?: unknown;
  fields?: Record<string, { value?: unknown } | Record<string, unknown>>;
}

interface FastifyMultipartRequest {
  isMultipart?: () => boolean;
  parts?: () => AsyncIterable<FastifyMultipartPart>;
  file?: Express.Multer.File | (() => Promise<FastifyMultipartPart>);
  files?: Express.Multer.File[];
  incomingFile?: Express.Multer.File;
  incomingFiles?: Express.Multer.File[];
  body?: Record<string, unknown>;
  [key: string]: unknown;
}

export function FastifyFileInterceptor(fieldName = 'file'): Type<NestInterceptor> {
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
            for await (const part of req.parts()) {
              if (part.file) {
                if (!capturedFile && (!fieldName || part.fieldname === fieldName)) {
                  const buffer = await part.toBuffer();
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
                } else if (part.fieldname === 'thumbnail') {
                  const buffer = await part.toBuffer();
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
                  await part.toBuffer();
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
            const part = await fileFn();
            if (part) {
              const buffer = await part.toBuffer();
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
        } catch {
          // Keep request alive if file extraction fails
        }
      }

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
              if (files.length < maxCount) {
                const buffer = await part.toBuffer();
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
                await part.toBuffer();
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
        } catch {
          // Keep request alive if stream error occurs
        }
      }

      return next.handle();
    }
  }

  return mixin(Interceptor);
}
