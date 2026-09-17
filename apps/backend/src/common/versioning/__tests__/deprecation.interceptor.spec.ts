import { type ExecutionContext, type CallHandler } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { DeprecationInterceptor } from '../deprecation.interceptor';
import type { MetricsService } from '../../../metrics/metrics.service';
import type { AlertingService } from '../../resilience/alerting.service';

describe('DeprecationInterceptor', () => {
  let interceptor: DeprecationInterceptor;
  let reflector: jest.Mocked<Reflector>;
  let mockMetricsService: { recordDeprecatedApiRequest: jest.Mock };
  let mockAlertingService: { sendDeprecatedApiUsageAlert: jest.Mock };

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    mockMetricsService = {
      recordDeprecatedApiRequest: jest.fn(),
    };

    mockAlertingService = {
      sendDeprecatedApiUsageAlert: jest.fn().mockResolvedValue(undefined),
    };

    interceptor = new DeprecationInterceptor(
      reflector,
      mockMetricsService as unknown as MetricsService,
      mockAlertingService as unknown as AlertingService,
    );
  });

  function createMockExecutionContext(
    headers: Record<string, string | undefined> = {},
    url = '/v1/users/legacy/lookup',
    method = 'GET',
  ) {
    const responseHeaders: Record<string, string> = {};
    const mockRequest = {
      url,
      method,
      headers,
    };
    const mockResponse = {
      setHeader: jest.fn((name: string, value: string) => {
        responseHeaders[name] = value;
      }),
      header: jest.fn((name: string, value: string) => {
        responseHeaders[name] = value;
      }),
      getHeader: jest.fn((name: string) => responseHeaders[name]),
    };

    const context = {
      getType: jest.fn().mockReturnValue('http'),
      getHandler: jest.fn().mockReturnValue(() => {}),
      getClass: jest.fn().mockReturnValue(class {}),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;

    return { context, mockRequest, mockResponse, responseHeaders };
  }

  it('passes through when endpoint is not deprecated', (done) => {
    const { context, mockResponse } = createMockExecutionContext();
    reflector.get.mockReturnValue(undefined);

    const callHandler: CallHandler = {
      handle: () => of({ success: true }),
    };

    interceptor.intercept(context, callHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({ success: true });
        expect(mockResponse.setHeader).not.toHaveBeenCalled();
        expect(mockMetricsService.recordDeprecatedApiRequest).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('sets Sunset, Deprecation, Link and notice headers on deprecated endpoints (RFC 8594)', (done) => {
    const { context, mockResponse } = createMockExecutionContext(
      { 'user-agent': 'Mozilla/5.0' },
      '/v1/posts/legacy-feed',
      'GET',
    );

    reflector.get.mockReturnValue({
      sunsetDate: '2026-12-31T23:59:59.000Z',
      deprecationDate: true,
      successor: '/v2/posts/feed',
      docUrl: 'https://api.example.com/docs/deprecations#posts-feed',
      message: 'Migrate to v2 feed',
    });

    const callHandler: CallHandler = {
      handle: () => of({ ok: true }),
    };

    interceptor.intercept(context, callHandler).subscribe({
      next: () => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Sunset',
          'Thu, 31 Dec 2026 23:59:59 GMT',
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'Link',
          '<https://api.example.com/docs/deprecations#posts-feed>; rel="deprecation"; type="text/html", <https://api.example.com/docs/deprecations#posts-feed>; rel="sunset"; type="text/html", </v2/posts/feed>; rel="successor-version"',
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'X-API-Deprecation-Notice',
          'Migrate to v2 feed',
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith('X-API-Replacement', '/v2/posts/feed');

        expect(mockMetricsService.recordDeprecatedApiRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            route: '/v1/posts/legacy-feed',
            isMobile: false,
          }),
        );
        done();
      },
    });
  });

  it('detects old mobile client and dispatches alerts', (done) => {
    const { context } = createMockExecutionContext(
      {
        'user-agent': 'SocialNetwork-iOS/1.2.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      },
      '/v1/users/lookup',
      'GET',
    );

    reflector.get.mockReturnValue({
      sunsetDate: '2026-11-15T00:00:00Z',
      minSupportedClientVersion: '2.0.0',
      alertOnMobile: true,
      successor: '/v2/users/search',
    });

    const callHandler: CallHandler = {
      handle: () => of({ ok: true }),
    };

    interceptor.intercept(context, callHandler).subscribe({
      next: () => {
        expect(mockMetricsService.recordDeprecatedApiRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            method: 'GET',
            route: '/v1/users/lookup',
            clientType: 'ios',
            clientVersion: '1.2.0',
            isMobile: true,
          }),
        );

        expect(mockAlertingService.sendDeprecatedApiUsageAlert).toHaveBeenCalledWith(
          expect.objectContaining({
            route: '/v1/users/lookup',
            method: 'GET',
            clientType: 'ios',
            clientVersion: '1.2.0',
            successor: '/v2/users/search',
            isOutdatedMobile: true,
          }),
        );
        done();
      },
    });
  });

  it('does not dispatch mobile alert if mobile client version satisfies minSupportedClientVersion', (done) => {
    const { context } = createMockExecutionContext(
      {
        'user-agent': 'SocialNetwork-Android/2.5.0 okhttp/4.9.0',
      },
      '/v1/users/lookup',
      'GET',
    );

    reflector.get.mockReturnValue({
      sunsetDate: '2026-11-15T00:00:00Z',
      minSupportedClientVersion: '2.0.0',
      alertOnMobile: true,
    });

    const callHandler: CallHandler = {
      handle: () => of({ ok: true }),
    };

    interceptor.intercept(context, callHandler).subscribe({
      next: () => {
        expect(mockMetricsService.recordDeprecatedApiRequest).toHaveBeenCalled();
        expect(mockAlertingService.sendDeprecatedApiUsageAlert).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
