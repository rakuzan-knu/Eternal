import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
  UseInterceptors,
  applyDecorators,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { createHash } from 'node:crypto';

export interface ETagOptions {
  weak?: boolean;
  cacheControl?: string;
}

interface HttpRequestAdapter {
  method?: string;
  headers?: Record<string, unknown>;
}

interface HttpResponseAdapter {
  headersSent?: boolean;
  status?: (code: number) => unknown;
  header?: (key: string, value: string) => unknown;
  setHeader?: (key: string, value: string) => void;
  getHeader?: (key: string) => unknown;
  raw?: {
    setHeader?: (key: string, value: string) => void;
    getHeader?: (key: string) => unknown;
  };
}

export function generateETag(payload: unknown, weak = true): string {
  if (payload === null || payload === undefined) {
    return weak ? 'W/"0"' : '"0"';
  }

  let raw = '';
  if (typeof payload === 'object') {
    raw = JSON.stringify(payload);
  } else if (
    typeof payload === 'string' ||
    typeof payload === 'number' ||
    typeof payload === 'boolean'
  ) {
    raw = String(payload);
  } else {
    raw = '';
  }

  const hash = createHash('sha1').update(raw).digest('base64url');
  return weak ? `W/"${hash}"` : `"${hash}"`;
}

export function isETagMatch(ifNoneMatchHeader: string | undefined, currentETag: string): boolean {
  if (!ifNoneMatchHeader) return false;

  const trimmed = ifNoneMatchHeader.trim();
  if (trimmed === '*') return true;

  const normalizedCurrent = currentETag.replace(/^W\//, '');
  const candidateTags = trimmed.split(',').map((t) => t.trim().replace(/^W\//, ''));

  return candidateTags.includes(normalizedCurrent);
}

@Injectable()
export class ETagInterceptor implements NestInterceptor {
  constructor(
    private readonly options: ETagOptions = {
      weak: true,
      cacheControl: 'private, no-cache',
    },
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<HttpRequestAdapter>();
    const res = http.getResponse<HttpResponseAdapter>();

    // ETags apply strictly to safe idempotent GET / HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next.handle();
    }

    return next.handle().pipe(
      map((data: unknown): unknown => {
        // If handler already handled or responded, pass through
        if (res.headersSent || data === undefined) {
          return data;
        }

        const etag = generateETag(data, this.options.weak ?? true);
        const cacheControl = this.options.cacheControl ?? 'private, no-cache';

        const setHeader = (k: string, v: string): void => {
          if (typeof res.setHeader === 'function') {
            res.setHeader(k, v);
          } else if (typeof res.header === 'function') {
            res.header(k, v);
          } else if (typeof res.raw?.setHeader === 'function') {
            res.raw.setHeader(k, v);
          }
        };

        const getHeader = (k: string): unknown => {
          if (typeof res.getHeader === 'function') return res.getHeader(k);
          if (typeof res.raw?.getHeader === 'function') return res.raw.getHeader(k);
          return undefined;
        };

        setHeader('ETag', etag);
        if (!getHeader('Cache-Control')) {
          setHeader('Cache-Control', cacheControl);
        }

        const rawHeader: unknown = req.headers?.['if-none-match'];
        const ifNoneMatch: string | undefined =
          typeof rawHeader === 'string'
            ? rawHeader
            : Array.isArray(rawHeader) && typeof rawHeader[0] === 'string'
              ? rawHeader[0]
              : undefined;
        if (ifNoneMatch && isETagMatch(ifNoneMatch, etag)) {
          if (typeof res.status === 'function') {
            res.status(HttpStatus.NOT_MODIFIED);
          }
          // Return null / empty for 304 to avoid serialization & transfer overhead
          return null;
        }

        return data;
      }),
    );
  }
}

/**
 * Decorator to easily enable ETag conditional caching on controllers or individual endpoints.
 */
export function ConditionalHttpCache(options?: ETagOptions) {
  return applyDecorators(UseInterceptors(new ETagInterceptor(options)));
}
