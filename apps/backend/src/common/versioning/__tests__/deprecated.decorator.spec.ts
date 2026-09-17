import { Reflector } from '@nestjs/core';
import {
  DeprecatedEndpoint,
  Sunset,
  DEPRECATED_ENDPOINT_KEY,
  type DeprecatedEndpointOptions,
} from '../deprecated.decorator';

describe('deprecated.decorator', () => {
  const reflector = new Reflector();

  it('sets metadata on controller method with @DeprecatedEndpoint', () => {
    class TestController {
      @DeprecatedEndpoint({
        sunsetDate: '2026-12-31T23:59:59Z',
        successor: '/v2/items',
      })
      deprecatedMethod() {
        return 'ok';
      }
    }

    const instance = new TestController();
    const metadata = reflector.get<DeprecatedEndpointOptions>(
      DEPRECATED_ENDPOINT_KEY,
      instance.deprecatedMethod,
    );

    expect(metadata).toBeDefined();
    expect(metadata.sunsetDate).toBe('2026-12-31T23:59:59Z');
    expect(metadata.successor).toBe('/v2/items');
  });

  it('sets metadata on controller class with @DeprecatedEndpoint', () => {
    @DeprecatedEndpoint({
      message: 'All endpoints in this controller are deprecated',
    })
    class DeprecatedController {}

    const metadata = reflector.get<DeprecatedEndpointOptions>(
      DEPRECATED_ENDPOINT_KEY,
      DeprecatedController,
    );

    expect(metadata).toBeDefined();
    expect(metadata.message).toBe('All endpoints in this controller are deprecated');
  });

  it('sets sunset date and default deprecationDate with @Sunset', () => {
    class TestController {
      @Sunset('2026-11-15T00:00:00Z', { successor: '/v2/resource' })
      sunsetMethod() {
        return 'ok';
      }
    }

    const instance = new TestController();
    const metadata = reflector.get<DeprecatedEndpointOptions>(
      DEPRECATED_ENDPOINT_KEY,
      instance.sunsetMethod,
    );

    expect(metadata).toBeDefined();
    expect(metadata.sunsetDate).toBe('2026-11-15T00:00:00Z');
    expect(metadata.deprecationDate).toBe(true);
    expect(metadata.successor).toBe('/v2/resource');
  });
});
