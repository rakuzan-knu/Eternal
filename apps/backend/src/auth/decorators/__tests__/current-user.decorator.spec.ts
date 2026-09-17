import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import type { ExecutionContext } from '@nestjs/common';
import { CurrentUser } from '../current-user.decorator';
import type { RequestUser } from '../../interfaces/jwt-payload.interface';

describe('CurrentUser decorator', () => {
  function getParamDecoratorFactory(decorator: typeof CurrentUser) {
    class TestController {
      public testMethod(@decorator() _user: RequestUser) {
        return _user;
      }
    }
    const metadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      TestController,
      'testMethod',
    ) as Record<string, { factory: (_data: unknown, ctx: ExecutionContext) => RequestUser }>;
    const key = Object.keys(metadata)[0];
    return metadata[key].factory;
  }

  it('extracts request.user from ExecutionContext', () => {
    const mockUser: RequestUser = {
      id: 'usr-999',
      email: 'alex@example.com',
      username: 'alex',
      sessionJti: 'jti-123',
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: mockUser,
        }),
      }),
    } as unknown as ExecutionContext;

    const factory = getParamDecoratorFactory(CurrentUser);
    const result = factory(null, mockContext);

    expect(result).toEqual(mockUser);
    expect(result.id).toBe('usr-999');
    expect(result.email).toBe('alex@example.com');
  });
});
