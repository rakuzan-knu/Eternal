import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000';

export const authHandlers = [
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.email === 'test@example.com' && body.password === 'Password123!') {
      return HttpResponse.json({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 'user-1',
          email: 'test@example.com',
          username: 'testuser',
          displayName: 'Test User',
        },
      });
    }

    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),

  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as Record<string, string>;

    if (body.email === 'existing@example.com') {
      return HttpResponse.json({ message: 'Email is already registered' }, { status: 409 });
    }

    return HttpResponse.json(
      {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 'user-2',
          email: body.email,
          username: body.username,
          displayName: body.displayName ?? null,
        },
      },
      { status: 201 },
    );
  }),

  http.post(`${API_URL}/auth/refresh`, () => {
    return HttpResponse.json({ accessToken: 'new-mock-access-token' });
  }),

  http.post(`${API_URL}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
