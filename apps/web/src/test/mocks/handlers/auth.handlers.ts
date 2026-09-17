import { http, HttpResponse } from 'msw';

export const authHandlers = [
  http.post('*/auth/login', async ({ request }) => {
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

  http.get('*/auth/check-username', ({ request }) => {
    const url = new URL(request.url);
    const username = url.searchParams.get('username');
    if (username === 'taken' || username === 'test_taken' || username === 'existing') {
      return HttpResponse.json({ isAvailable: false });
    }
    return HttpResponse.json({ isAvailable: true });
  }),

  http.post('*/auth/register', async ({ request }) => {
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

  http.post('*/auth/refresh', () => {
    return HttpResponse.json({ accessToken: 'new-mock-access-token' });
  }),

  http.post('*/auth/logout', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('*/auth/find-account', async () => {
    return HttpResponse.json({
      id: 'user-1',
      name: 'Alex Kovalenko',
      role: 'User',
      emoji: '👑',
      src: null,
      maskedEmail: 'u***@example.com',
      maskedPhone: '+380 •• ••• •• 99',
    });
  }),

  http.post('*/auth/change-password', () => {
    return HttpResponse.json({ success: true });
  }),

  http.get('*/auth/sessions', () => {
    return HttpResponse.json([
      {
        id: 'session-1',
        device: 'Chrome on Windows',
        ip: '127.0.0.1',
        lastActive: new Date().toISOString(),
        isCurrent: true,
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.delete('*/auth/sessions/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete('*/auth/sessions', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('*/users/me', () => {
    return HttpResponse.json({
      id: 'user-1',
      username: 'my_profile',
      displayName: 'Ayate',
      email: 'test@example.com',
      bio: 'Rozroblyayu Eternal.',
      avatar: null,
      createdAt: '2026-06-30T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
  }),

  http.get('*/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: id as string,
      username: 'my_profile',
      displayName: 'Ayate',
      email: 'test@example.com',
      bio: 'Rozroblyayu Eternal.',
      avatar: null,
      createdAt: '2026-06-30T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
  }),
];
