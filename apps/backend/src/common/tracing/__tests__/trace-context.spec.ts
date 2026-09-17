import { TraceContext } from '../trace-context';

describe('TraceContext', () => {
  it('stores and retrieves trace context across async execution', async () => {
    expect(TraceContext.getStore()).toBeUndefined();
    expect(TraceContext.getTraceId()).toBeUndefined();
    expect(TraceContext.getUserId()).toBeUndefined();

    await TraceContext.run(
      {
        traceId: 'trace-123',
        correlationId: 'trace-123',
        reqMethod: 'GET',
        reqUrl: '/api/posts',
      },
      async () => {
        expect(TraceContext.getTraceId()).toBe('trace-123');
        expect(TraceContext.getStore()?.reqMethod).toBe('GET');

        TraceContext.setUserId('user-456');
        expect(TraceContext.getUserId()).toBe('user-456');

        TraceContext.setTraceId('trace-789');
        expect(TraceContext.getTraceId()).toBe('trace-789');

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(TraceContext.getTraceId()).toBe('trace-789');
        expect(TraceContext.getUserId()).toBe('user-456');
      },
    );

    expect(TraceContext.getStore()).toBeUndefined();
  });

  it('handles setUserId / setTraceId safely when store is not initialized', () => {
    expect(() => TraceContext.setUserId('user-1')).not.toThrow();
    expect(() => TraceContext.setTraceId('trace-1')).not.toThrow();
    expect(TraceContext.getTraceId()).toBeUndefined();
  });

  it('isolates context between concurrent async tasks without leaks', async () => {
    const task1 = TraceContext.runIsolated({ traceId: 'task-1', userId: 'user-1' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      TraceContext.setUserId('user-1-updated');
      expect(TraceContext.getTraceId()).toBe('task-1');
      expect(TraceContext.getUserId()).toBe('user-1-updated');
      return TraceContext.snapshot();
    });

    const task2 = TraceContext.runIsolated({ traceId: 'task-2', userId: 'user-2' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(TraceContext.getTraceId()).toBe('task-2');
      expect(TraceContext.getUserId()).toBe('user-2');
      return TraceContext.snapshot();
    });

    const [res1, res2] = await Promise.all([task1, task2]);
    expect(res1?.traceId).toBe('task-1');
    expect(res1?.userId).toBe('user-1-updated');
    expect(res2?.traceId).toBe('task-2');
    expect(res2?.userId).toBe('user-2');
    expect(TraceContext.getStore()).toBeUndefined();
  });

  it('cleans up context even when async callbacks throw an error', async () => {
    await expect(
      TraceContext.runIsolated({ traceId: 'err-trace' }, async () => {
        expect(TraceContext.getTraceId()).toBe('err-trace');
        throw new Error('Simulated failure');
      }),
    ).rejects.toThrow('Simulated failure');

    expect(TraceContext.getStore()).toBeUndefined();
    expect(TraceContext.getTraceId()).toBeUndefined();
  });

  it('supports exit to escape active context during detached background execution', () => {
    TraceContext.run({ traceId: 'parent-trace', userId: 'parent-user' }, () => {
      expect(TraceContext.getTraceId()).toBe('parent-trace');

      TraceContext.exit(() => {
        expect(TraceContext.getStore()).toBeUndefined();
        expect(TraceContext.getTraceId()).toBeUndefined();
      });

      expect(TraceContext.getTraceId()).toBe('parent-trace');
    });

    expect(TraceContext.getStore()).toBeUndefined();
  });

  it('binds context across async callbacks', (done) => {
    TraceContext.run({ traceId: 'bound-trace' }, () => {
      const boundFn = TraceContext.bind(() => {
        expect(TraceContext.getTraceId()).toBe('bound-trace');
        done();
      });

      // Execute in detached nextTick
      process.nextTick(() => {
        boundFn();
      });
    });
  });
});
