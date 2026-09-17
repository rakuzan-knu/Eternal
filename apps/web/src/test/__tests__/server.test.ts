import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

describe('test/mocks/server MSW server configuration', () => {
  it('exports an active setupServer instance with preconfigured handlers', async () => {
    expect(server).toBeDefined();
    expect(typeof server.use).toBe('function');
    expect(typeof server.resetHandlers).toBe('function');
  });

  it('intercepts requests configured in base handlers', async () => {
    const res = await fetch('http://localhost:3000/api/users/me/privacy');
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { isPrivate: boolean; autoDeletePeriod: string };
    expect(data.isPrivate).toBe(false);
    expect(data.autoDeletePeriod).toBe('OFF');
  });

  it('allows overriding handlers dynamically at runtime via server.use()', async () => {
    server.use(
      http.get('*/custom-override-endpoint', () => {
        return HttpResponse.json({ status: 'overridden-ok' });
      }),
    );

    const res = await fetch('http://localhost:3000/api/custom-override-endpoint');
    expect(res.ok).toBe(true);
    const data = (await res.json()) as { status: string };
    expect(data.status).toBe('overridden-ok');
  });
});
