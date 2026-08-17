// @vitest-environment node
import { describe, it } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';

const { like, eachLike, string, integer, boolean, uuid, regex, nullValue } = MatchersV3;

/**
 * Consumer-driven contract tests: the frontend (consumer) describes exactly
 * the requests it makes and the response fields it depends on. The generated
 * pact files land in backend/pacts/ for provider verification.
 *
 * Paths intentionally omit any gateway prefix: apiClient's baseURL already
 * contains the deployment origin, and the NestJS backend serves these routes
 * at their root (e.g. POST /auth/login).
 */
const provider = new PactV3({
  consumer: 'frontend',
  provider: 'backend',
  port: 4010,
  dir: path.resolve(__dirname, '../../../backend/pacts'),
});

/** ISO-8601 with millis; a regex matcher avoids datetime-format skew between pact-js and the verifier. */
const ISO_DATETIME =
  '^\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d\\.\\d+(Z|[+-][0-2]\\d:?[0-5]\\d)$';

/** Public user shape returned by auth (auth.service.ts toPublicUser). */
const publicUser = {
  id: uuid(),
  email: like('alice@example.com'),
  username: like('alice'),
  displayName: like('Alice Mock'),
};

/**
 * Post fields consumed by normalizePost (entities/post/api/postsApi.ts).
 * Mirrors PostResponseDto: `author` is the display-name STRING, not an object.
 */
const postBody = {
  id: uuid(),
  content: like('Hello from the contract test'),
  createdAt: regex(ISO_DATETIME, '2026-01-01T12:00:00.000Z'),
  authorId: uuid(),
  author: like('Alice Mock'),
  handle: like('alice'),
  media: eachLike({
    type: like('IMAGE'),
    url: like('https://cdn.example.com/post.jpg'),
    order: integer(0),
  }),
  likesCount: integer(12),
  commentsCount: integer(3),
  repostsCount: integer(1),
};

describe('consumer contract: backend API', () => {
  it('auth: posts credentials to /auth/login and receives a token pair', async () => {
    await provider
      .given('a user exists with email alice@example.com')
      .uponReceiving('a login request')
      .withRequest({
        method: 'POST',
        path: '/auth/login',
        headers: { 'Content-Type': 'application/json' },
        body: {
          email: 'alice@example.com',
          identity: 'alice@example.com',
          password: 'correct-horse-battery',
        },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          accessToken: string('jwt-access-token'),
          refreshToken: string('jwt-refresh-token'),
          user: like(publicUser),
        },
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'alice@example.com',
            identity: 'alice@example.com',
            password: 'correct-horse-battery',
          }),
        });
        if (!response.ok) throw new Error(`login failed: ${response.status}`);
        const body = (await response.json()) as {
          accessToken: string;
          refreshToken: string;
          user: { id: string; username: string };
        };
        if (!body.accessToken || !body.refreshToken || !body.user.id) {
          throw new Error('token pair or user missing from login response');
        }
      });
  });

  it('feed: GET /posts returns a paginated page the feed can normalize', async () => {
    await provider
      .given('the feed contains exactly one post and no further pages')
      .uponReceiving('a paginated feed request')
      .withRequest({
        method: 'GET',
        path: '/posts',
        query: { limit: '10' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          data: eachLike(postBody),
          meta: {
            nextCursor: nullValue(),
            hasNextPage: boolean(false),
          },
        },
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/posts?limit=10`);
        if (!response.ok) throw new Error(`feed failed: ${response.status}`);
        const body = (await response.json()) as {
          data: { content: string; author: string }[];
          meta: { hasNextPage: boolean };
        };
        if (body.data.length === 0 || !body.data[0].content) {
          throw new Error('feed page has no consumable posts');
        }
        if (typeof body.meta.hasNextPage !== 'boolean') {
          throw new Error('feed page meta missing hasNextPage');
        }
      });
  });

  it('chat: GET /conversations returns conversation views for the list', async () => {
    await provider
      .given('the user participates in one direct conversation with a last message')
      .uponReceiving('a conversation list request')
      .withRequest({
        method: 'GET',
        path: '/conversations',
        // The endpoint is auth-guarded; apiClient attaches the bearer token.
        headers: { Authorization: 'Bearer pact-access-token' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: eachLike({
          id: uuid(),
          type: like('DIRECT'),
          participants: eachLike({
            userId: uuid(),
            user: like({
              id: uuid(),
              username: like('bob'),
              displayName: like('Bob Mock'),
            }),
          }),
          lastMessage: like({
            id: uuid(),
            body: like('Hey there'),
            createdAt: regex(ISO_DATETIME, '2026-01-01T12:00:00.000Z'),
          }),
          unreadCount: integer(1),
        }),
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/conversations`, {
          headers: { Authorization: 'Bearer pact-access-token' },
        });
        if (!response.ok) throw new Error(`conversations failed: ${response.status}`);
        const body = (await response.json()) as {
          id: string;
          participants: { user: { username: string } }[];
        }[];
        if (body.length === 0 || !body[0].participants[0].user.username) {
          throw new Error('conversation view missing participants');
        }
      });
  });

  it('profile: GET /users/by-username/:username returns the profile fields', async () => {
    await provider
      .given('a user with username alice exists')
      .uponReceiving('a profile lookup by username')
      .withRequest({
        method: 'GET',
        path: '/users/by-username/alice',
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        // Mirrors UserProfileDto (common/contracts/users.ts).
        body: like({
          id: uuid(),
          username: like('alice'),
          displayName: like('Alice Mock'),
          avatar: nullValue(),
          bio: like('Mocked biography'),
          isPrivate: boolean(false),
          isVerified: boolean(false),
          createdAt: regex(ISO_DATETIME, '2026-01-01T12:00:00.000Z'),
        }),
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/users/by-username/alice`);
        if (!response.ok) throw new Error(`profile failed: ${response.status}`);
        const body = (await response.json()) as {
          username: string;
          isPrivate: boolean;
        };
        if (body.username !== 'alice' || typeof body.isPrivate !== 'boolean') {
          throw new Error('profile response missing expected fields');
        }
      });
  });

  it('search: GET /users/search returns people results for a query', async () => {
    await provider
      .given('a user with username carol and no avatar exists')
      .uponReceiving('a people search request')
      .withRequest({
        method: 'GET',
        path: '/users/search',
        query: { q: 'carol' },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        // searchUsers returns UserProfileDto[] (common/contracts/users.ts).
        body: eachLike({
          id: uuid(),
          username: like('carol'),
          displayName: like('Carol Mock'),
          avatar: nullValue(),
          isPrivate: boolean(false),
          isVerified: boolean(false),
        }),
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/users/search?q=carol`);
        if (!response.ok) throw new Error(`search failed: ${response.status}`);
        const body = (await response.json()) as { username: string }[];
        if (body.length === 0 || body[0].username !== 'carol') {
          throw new Error('people search returned no matching user');
        }
      });
  });
});
