/**
 * Consumer-Driven API Contract Specification (Pact)
 * Defines frontend API contract expectations for backend service endpoints.
 */
import { describe, expect, it } from 'vitest';

export interface PactInteraction {
  uponReceiving: string;
  withRequest: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    path: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  willRespondWith: {
    status: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
}

export interface PactContract {
  consumer: { name: string };
  provider: { name: string };
  interactions: PactInteraction[];
}

export const frontendBackendContract: PactContract = {
  consumer: { name: 'SocialNetworkFrontend' },
  provider: { name: 'SocialNetworkBackend' },
  interactions: [
    {
      uponReceiving: 'a request for backend health status',
      withRequest: {
        method: 'GET',
        path: '/api/health',
      },
      willRespondWith: {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
        body: {
          status: 'ok',
          info: {
            database: { status: 'up' },
            redis: { status: 'up' },
          },
        },
      },
    },
    {
      uponReceiving: 'a request to authenticate user credentials',
      withRequest: {
        method: 'POST',
        path: '/api/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        body: {
          email: 'user@example.com',
          password: 'Password123!',
        },
      },
      willRespondWith: {
        status: 200,
        headers: {
          'content-type': 'application/json; charset=utf-8',
        },
        body: {
          accessToken: 'mock_jwt_token',
          user: {
            id: 'usr_123',
            email: 'user@example.com',
          },
        },
      },
    },
  ],
};

describe('Pact Consumer Contract', () => {
  it('defines valid consumer contract interactions', () => {
    expect(frontendBackendContract.consumer.name).toBe('SocialNetworkFrontend');
    expect(frontendBackendContract.provider.name).toBe('SocialNetworkBackend');
    expect(frontendBackendContract.interactions.length).toBeGreaterThan(0);
  });
});
