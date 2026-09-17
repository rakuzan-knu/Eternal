import { describe, it, expect } from 'vitest';
import { handlers } from '../handlers';

describe('MSW Default Handlers', () => {
  it('defines the expected MSW mock handlers', () => {
    expect(handlers).toHaveLength(3);
  });

  it('handles /stories/feed requests returning an empty array', async () => {
    const feedHandler = handlers[0];
    const responseResolver = (feedHandler as any).resolver;

    const mockRequest = new Request('http://localhost:3000/api/stories/feed');
    const result = await responseResolver({
      request: mockRequest,
      params: {},
      cookies: {},
    });

    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body).toEqual([]);
  });

  it('handles /stories/user/:userId requests returning null', async () => {
    const userStoriesHandler = handlers[1];
    const responseResolver = (userStoriesHandler as any).resolver;

    const mockRequest = new Request('http://localhost:3000/api/stories/user/u-123');
    const result = await responseResolver({
      request: mockRequest,
      params: { userId: 'u-123' },
      cookies: {},
    });

    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body).toBeNull();
  });

  it('handles /api/profile/:userId requests returning mock user profile data', async () => {
    const profileHandler = handlers[2];
    const responseResolver = (profileHandler as any).resolver;

    const mockRequest = new Request('http://localhost:3000/api/profile/custom-user-456');
    const result = await responseResolver({
      request: mockRequest,
      params: { userId: 'custom-user-456' },
      cookies: {},
    });

    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body).toEqual({
      id: 'custom-user-456',
      username: 'mockuser',
      displayName: 'Mock User',
      avatar: null,
    });
  });
});
