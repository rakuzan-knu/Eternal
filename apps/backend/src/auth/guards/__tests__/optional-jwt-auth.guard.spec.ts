import type { ExecutionContext } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { OptionalAuthGuard, OptionalJwtAuthGuard } from '../optional-jwt-auth.guard';

describe('OptionalJwtAuthGuard', () => {
  let guard: OptionalAuthGuard;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    guard = new OptionalAuthGuard();
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {},
        }),
        getResponse: jest.fn().mockReturnValue({}),
        getNext: jest.fn(),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
  });

  it('exports OptionalJwtAuthGuard as alias of OptionalAuthGuard', () => {
    expect(OptionalJwtAuthGuard).toBe(OptionalAuthGuard);
  });

  it('handleRequest returns user if present or null otherwise', () => {
    const mockUser = { id: 'usr-1', email: 'test@example.com' };
    expect(guard.handleRequest(null, mockUser)).toEqual(mockUser);
    expect(guard.handleRequest(new Error('Auth failed'), null)).toBeNull();
    expect(guard.handleRequest(null, undefined)).toBeNull();
  });

  it('canActivate resolves true when super.canActivate rejects promise', async () => {
    jest
      .spyOn(Object.getPrototypeOf(OptionalAuthGuard.prototype), 'canActivate')
      .mockRejectedValueOnce(new Error('Unauthorized'));

    const result = await guard.canActivate(mockContext);
    expect(result).toBe(true);
  });

  it('canActivate catches observable error and emits true', (done) => {
    jest
      .spyOn(Object.getPrototypeOf(OptionalAuthGuard.prototype), 'canActivate')
      .mockReturnValueOnce(throwError(() => new Error('Invalid token')));

    const result = guard.canActivate(mockContext);
    expect(result).toBeInstanceOf(Observable);
    (result as Observable<boolean>).subscribe({
      next: (val) => {
        expect(val).toBe(true);
        done();
      },
    });
  });

  it('canActivate passes through successful observable', (done) => {
    jest
      .spyOn(Object.getPrototypeOf(OptionalAuthGuard.prototype), 'canActivate')
      .mockReturnValueOnce(of(true));

    const result = guard.canActivate(mockContext);
    expect(result).toBeInstanceOf(Observable);
    (result as Observable<boolean>).subscribe({
      next: (val) => {
        expect(val).toBe(true);
        done();
      },
    });
  });
});
