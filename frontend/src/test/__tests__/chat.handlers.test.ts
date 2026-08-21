import { describe, it, expect } from 'vitest';
import { chatHandlers } from '../mocks/handlers/chat.handlers';

describe('test/mocks/handlers/chat.handlers MSW integration', () => {
  it('exports an array of MSW chat request handlers', () => {
    expect(Array.isArray(chatHandlers)).toBe(true);
    expect(chatHandlers.length).toBeGreaterThanOrEqual(5);
  });

  it('fetches conversations list (GET */conversations)', async () => {
    const res = await fetch('http://localhost:3000/conversations');
    expect(res.status).toBe(200);
    const data = (await res.json()) as unknown[];
    expect(Array.isArray(data)).toBe(true);
  });

  it('fetes conversation messages (GET */conversations/:id/messages)', async () => {
    const res = await fetch('http://localhost:3000/conversations/c1/messages?limit=20');
    expect(res.status).toBe(200);
    const data = (await res.json()) as { messages: unknown[]; meta: { hasNextPage: boolean } };
    expect(data.messages).toEqual([]);
    expect(data.meta.hasNextPage).toBe(false);
  });
});
