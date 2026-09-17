import type { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { WsTraceInterceptor } from '../ws-trace.interceptor';
import { TraceContext } from '../trace-context';

describe('WsTraceInterceptor', () => {
  let interceptor: WsTraceInterceptor;

  beforeEach(() => {
    interceptor = new WsTraceInterceptor();
  });

  it('runs WebSocket handler within isolated TraceContext', (done) => {
    const mockContext = {
      getType: () => 'ws',
      switchToWs: () => ({
        getClient: () => ({
          id: 'socket-1',
          userId: 'user-ws-1',
          traceId: 'trace-ws-1',
        }),
      }),
      getHandler: () => ({ name: 'handleMessage' }),
    } as unknown as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => {
        expect(TraceContext.getTraceId()).toBe('trace-ws-1');
        expect(TraceContext.getUserId()).toBe('user-ws-1');
        return of({ success: true });
      },
    };

    expect(TraceContext.getStore()).toBeUndefined();

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (val) => {
        expect(val).toEqual({ success: true });
      },
      complete: () => {
        expect(TraceContext.getStore()).toBeUndefined();
        done();
      },
    });
  });

  it('bypasses non-ws context', (done) => {
    const mockContext = {
      getType: () => 'http',
    } as unknown as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of({ http: true }),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (val) => {
        expect(val).toEqual({ http: true });
      },
      complete: () => {
        done();
      },
    });
  });

  it('propagates errors while maintaining store isolation', (done) => {
    const mockContext = {
      getType: () => 'ws',
      switchToWs: () => ({
        getClient: () => ({
          userId: 'user-err',
          traceId: 'trace-err',
        }),
      }),
      getHandler: () => ({ name: 'handleError' }),
    } as unknown as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => {
        expect(TraceContext.getTraceId()).toBe('trace-err');
        return throwError(() => new Error('WS failure'));
      },
    };

    expect(TraceContext.getStore()).toBeUndefined();

    interceptor.intercept(mockContext, mockHandler).subscribe({
      error: (err: Error) => {
        expect(err.message).toBe('WS failure');
        expect(TraceContext.getStore()).toBeUndefined();
        done();
      },
    });
  });
});
