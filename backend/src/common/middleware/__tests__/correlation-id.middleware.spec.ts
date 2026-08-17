import type { NextFunction, Request, Response } from 'express';
import { CorrelationIdMiddleware } from '../correlation-id.middleware';

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new CorrelationIdMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('generates a new UUID correlation-id when headers are absent', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.correlationId).toBeDefined();
    expect(typeof mockRequest.correlationId).toBe('string');
    expect(mockRequest.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      mockRequest.correlationId,
    );
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

  it('preserves incoming x-correlation-id header', () => {
    mockRequest.headers = {
      'x-correlation-id': 'custom-client-corr-id-123',
    };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.correlationId).toBe('custom-client-corr-id-123');
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      'custom-client-corr-id-123',
    );
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

  it('falls back to x-request-id when x-correlation-id is missing', () => {
    mockRequest.headers = {
      'x-request-id': 'req-id-abc-456',
    };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.correlationId).toBe('req-id-abc-456');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-correlation-id', 'req-id-abc-456');
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });

  it('extracts first element when header is passed as an array', () => {
    mockRequest.headers = {
      'x-correlation-id': ['first-array-id', 'second-array-id'],
    };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.correlationId).toBe('first-array-id');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-correlation-id', 'first-array-id');
    expect(nextFunction).toHaveBeenCalledTimes(1);
  });
});
