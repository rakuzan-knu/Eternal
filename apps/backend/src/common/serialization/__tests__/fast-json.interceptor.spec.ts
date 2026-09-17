import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { FastJsonInterceptor } from '../fast-json.interceptor';
import { FastJsonService } from '../fast-json.service';

describe('FastJsonInterceptor', () => {
  let interceptor: FastJsonInterceptor;
  let reflector: Reflector;
  let fastJsonService: FastJsonService;

  beforeEach(() => {
    reflector = new Reflector();
    fastJsonService = new FastJsonService();
    interceptor = new FastJsonInterceptor(reflector, fastJsonService);
  });

  it('passes through without serialization if no schema metadata present', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getResponse: () => ({ header: jest.fn() }),
      }),
    } as unknown as ExecutionContext;

    const next = {
      handle: () => of({ raw: true }),
    } as unknown as CallHandler;

    interceptor.intercept(context, next).subscribe((res) => {
      expect(res).toEqual({ raw: true });
      done();
    });
  });

  it('serializes response with compiled schema when metadata is present', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('STATUS_OK');

    const headerMock = jest.fn();
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getResponse: () => ({ header: headerMock }),
      }),
    } as unknown as ExecutionContext;

    const payload = { status: 'success', success: true };
    const next = {
      handle: () => of(payload),
    } as unknown as CallHandler;

    interceptor.intercept(context, next).subscribe((res) => {
      expect(typeof res).toBe('string');
      expect(headerMock).toHaveBeenCalledWith('content-type', 'application/json; charset=utf-8');
      expect(JSON.parse(res as string)).toEqual({ status: 'success', success: true });
      done();
    });
  });
});
