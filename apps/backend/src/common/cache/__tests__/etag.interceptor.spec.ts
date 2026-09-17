import type { ExecutionContext } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';
import { ETagInterceptor, generateETag, isETagMatch } from '../etag.interceptor';

describe('ETagInterceptor & utilities', () => {
  describe('generateETag', () => {
    it('generates weak ETag by default', () => {
      const etag = generateETag({ id: 'u1', username: 'alice' });
      expect(etag.startsWith('W/"')).toBe(true);
      expect(etag.endsWith('"')).toBe(true);
    });

    it('generates strong ETag when weak = false', () => {
      const etag = generateETag({ id: 'u1', username: 'alice' }, false);
      expect(etag.startsWith('W/"')).toBe(false);
      expect(etag.startsWith('"')).toBe(true);
      expect(etag.endsWith('"')).toBe(true);
    });

    it('handles updatedAt / updated_at optimization', () => {
      const etag1 = generateETag({ id: 'u1', updatedAt: '2026-09-01T10:00:00.000Z' });
      const etag2 = generateETag({ id: 'u1', updatedAt: '2026-09-01T10:00:00.000Z' });
      const etag3 = generateETag({ id: 'u1', updatedAt: '2026-09-01T10:05:00.000Z' });

      expect(etag1).toBe(etag2);
      expect(etag1).not.toBe(etag3);
    });

    it('handles null and undefined', () => {
      expect(generateETag(null)).toBe('W/"0"');
      expect(generateETag(undefined, false)).toBe('"0"');
    });
  });

  describe('isETagMatch', () => {
    it('matches wildcard *', () => {
      expect(isETagMatch('*', 'W/"123"')).toBe(true);
    });

    it('matches identical weak or strong ETags', () => {
      expect(isETagMatch('W/"abc"', 'W/"abc"')).toBe(true);
      expect(isETagMatch('"abc"', 'W/"abc"')).toBe(true);
      expect(isETagMatch('W/"abc"', '"abc"')).toBe(true);
    });

    it('matches comma-separated list of candidate tags', () => {
      expect(isETagMatch('"xyz", W/"abc", "foo"', 'W/"abc"')).toBe(true);
      expect(isETagMatch('"xyz", "foo"', 'W/"abc"')).toBe(false);
    });

    it('returns false when If-None-Match is undefined or empty', () => {
      expect(isETagMatch(undefined, 'W/"abc"')).toBe(false);
      expect(isETagMatch('', 'W/"abc"')).toBe(false);
    });
  });

  describe('ETagInterceptor.intercept', () => {
    let interceptor: ETagInterceptor;
    let mockReq: { method: string; headers: Record<string, string> };
    let mockRes: {
      headersSent: boolean;
      headers: Record<string, string>;
      statusCode: number;
      setHeader: jest.Mock;
      getHeader: jest.Mock;
      status: jest.Mock;
    };
    let mockContext: ExecutionContext;

    beforeEach(() => {
      interceptor = new ETagInterceptor();
      mockReq = {
        method: 'GET',
        headers: {},
      };
      mockRes = {
        headersSent: false,
        headers: {},
        statusCode: 200,
        setHeader: jest.fn((k: string, v: string) => {
          mockRes.headers[k.toLowerCase()] = v;
        }),
        getHeader: jest.fn((k: string) => mockRes.headers[k.toLowerCase()]),
        status: jest.fn((code: number) => {
          mockRes.statusCode = code;
          return mockRes;
        }),
      };
      mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockReq,
          getResponse: () => mockRes,
        }),
      } as unknown as ExecutionContext;
    });

    it('passes through non-GET/HEAD methods without adding ETag', (done) => {
      mockReq.method = 'POST';
      const handler = { handle: () => of({ success: true }) };

      interceptor.intercept(mockContext, handler).subscribe((result) => {
        expect(result).toEqual({ success: true });
        expect(mockRes.setHeader).not.toHaveBeenCalled();
        done();
      });
    });

    it('sets ETag and Cache-Control headers on fresh 200 GET response', (done) => {
      const payload = { id: 'u1', username: 'bob' };
      const handler = { handle: () => of(payload) };

      interceptor.intercept(mockContext, handler).subscribe((result) => {
        expect(result).toEqual(payload);
        expect(mockRes.setHeader).toHaveBeenCalledWith('ETag', expect.stringMatching(/^W\//));
        expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-cache');
        expect(mockRes.status).not.toHaveBeenCalled();
        done();
      });
    });

    it('returns 304 Not Modified and null body when If-None-Match matches', (done) => {
      const payload = { id: 'u1', username: 'bob' };
      const expectedETag = generateETag(payload);
      mockReq.headers['if-none-match'] = expectedETag;

      const handler = { handle: () => of(payload) };

      interceptor.intercept(mockContext, handler).subscribe((result) => {
        expect(result).toBeNull();
        expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.NOT_MODIFIED);
        expect(mockRes.setHeader).toHaveBeenCalledWith('ETag', expectedETag);
        done();
      });
    });
  });
});
